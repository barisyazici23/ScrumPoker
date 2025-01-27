const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3002;

const io = socketIo(server, {
  cors: {
    origin: true, // Allow all origins in production
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["my-custom-header"]
  },
  allowEIO3: true,
  pingTimeout: 10000,
  pingInterval: 5000,
  connectTimeout: 10000,
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 1e8
});

app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/dist')));

// API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Handle all other requests by serving the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// Store rooms in memory
const rooms = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  // Handle room creation
  socket.on('createRoom', (callback) => {
    try {
      const roomId = Math.random().toString(36).substring(2, 8);
      console.log('Creating room:', roomId);
      
      // Create room with initial state
      const room = {
        id: roomId,
        host: socket.id,
        users: new Map(),
        votes: new Map(),
        isVotingActive: false,
        createdAt: Date.now()
      };

      // Add the host as the first user
      room.users.set(socket.id, {
        id: socket.id,
        username: null, // Will be set when joining
        isHost: true,
        vote: null
      });

      rooms.set(roomId, room);
      socket.join(roomId);
      socket.roomId = roomId;
      
      console.log(`Room created successfully: ${roomId}, Host: ${socket.id}`);
      console.log('Current rooms:', Array.from(rooms.keys()));
      
      callback(null, roomId);
    } catch (error) {
      console.error('Room creation error:', error);
      callback(error.message || 'Failed to create room', null);
    }
  });

  // Handle joining room
  socket.on('joinRoom', ({ roomId, username }, callback) => {
    console.log('Join room request received:', { roomId, username, socketId: socket.id });
    console.log('Available rooms:', Array.from(rooms.keys()));
    
    const room = rooms.get(roomId);
    
    if (!room) {
      console.error(`Room not found: ${roomId}`);
      callback({ success: false, error: 'Room not found' });
      return;
    }

    try {
      socket.join(roomId);
      socket.roomId = roomId;
      
      // Check if this socket is the host
      const isHost = room.host === socket.id;
      
      // Update or add user to room
      const user = {
        id: socket.id,
        username,
        isHost,
        vote: null
      };
      
      room.users.set(socket.id, user);

      // Convert users Map to array for sending to clients
      const userList = Array.from(room.users.values());
      console.log(`User ${username} joined room ${roomId}. Current users:`, userList);

      // Notify all users in the room
      io.to(roomId).emit('userJoined', userList);
      
      callback({ 
        success: true,
        users: userList,
        isHost,
        roomState: {
          id: roomId,
          isVotingActive: room.isVotingActive,
          votes: Array.from(room.votes.entries()).map(([userId, vote]) => ({
            userId,
            vote,
            username: room.users.get(userId)?.username
          }))
        }
      });
    } catch (error) {
      console.error('Error joining room:', error);
      callback({ success: false, error: error.message || 'Failed to join room' });
    }
  });

  // Handle voting
  socket.on('vote', ({ roomId, value }) => {
    const room = rooms.get(roomId);
    if (room && room.isVotingActive) {
      // Update user's vote
      const user = room.users.get(socket.id);
      if (user) {
        user.vote = value;
      }
      room.votes.set(socket.id, value);

      // Emit updated user list to show who has voted
      const userList = Array.from(room.users.values());
      io.to(roomId).emit('userJoined', userList);

      // Check if all users have voted
      const totalUsers = room.users.size;
      const votedUsers = Array.from(room.users.values()).filter(u => u.vote !== null).length;

      if (votedUsers === totalUsers) {
        const votes = Array.from(room.votes.values());
        const numericVotes = votes.filter(v => v !== '☕' && v !== '?' && !isNaN(v)).map(Number);
        
        let result = {
          votes: Array.from(room.votes.entries()).map(([userId, vote]) => ({
            username: room.users.get(userId).username,
            vote
          })),
          average: 0,
          coffeeBreaks: votes.filter(v => v === '☕').length,
          unsureVotes: votes.filter(v => v === '?').length
        };

        if (numericVotes.length > 0) {
          const sum = numericVotes.reduce((a, b) => a + b, 0);
          result.average = (sum / numericVotes.length).toFixed(1);
        }

        io.to(roomId).emit('votingComplete', result);
      } else {
        // Emit progress update
        io.to(roomId).emit('voteUpdate', {
          totalVotes: votedUsers,
          expectedVotes: totalUsers,
          userList
        });
      }
    }
  });

  // Handle start voting
  socket.on('startVoting', ({ roomId }, callback) => {
    console.log('Start voting request received:', { roomId, socketId: socket.id });
    const room = rooms.get(roomId);
    
    if (!room) {
      callback(new Error('Room not found'));
      return;
    }
    
    if (room.host !== socket.id) {
      callback(new Error('Only the host can start voting'));
      return;
    }

    try {
      room.isVotingActive = true;
      room.votes.clear();
      // Reset all users' votes
      for (const user of room.users.values()) {
        user.vote = null;
      }
      // Send updated user list to all clients
      const userList = Array.from(room.users.values());
      io.to(roomId).emit('userJoined', userList);
      io.to(roomId).emit('votingStarted');
      callback(null);
    } catch (error) {
      callback(error.message || 'Failed to start voting');
    }
  });

  // Handle end voting
  socket.on('endVoting', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.host === socket.id) {
      room.isVotingActive = false;

      // Calculate final results
      const votes = Array.from(room.votes.values());
      const numericVotes = votes.filter(v => v !== '☕' && v !== '?' && !isNaN(v)).map(Number);
      
      let result = {
        votes: Array.from(room.votes.entries()).map(([userId, vote]) => ({
          username: room.users.get(userId).username,
          vote
        })),
        average: 0,
        coffeeBreaks: votes.filter(v => v === '☕').length,
        unsureVotes: votes.filter(v => v === '?').length
      };

      if (numericVotes.length > 0) {
        const sum = numericVotes.reduce((a, b) => a + b, 0);
        result.average = (sum / numericVotes.length).toFixed(1);
      }

      io.to(roomId).emit('votingComplete', result);
      io.to(roomId).emit('votingEnded');
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Find the room this user was in
    for (const [roomId, room] of rooms.entries()) {
      const userIndex = Array.from(room.users.values()).findIndex(user => user.id === socket.id);
      if (userIndex !== -1) {
        // Remove user from the room
        room.users.delete(socket.id);
        room.votes.delete(socket.id);
        
        // If room is empty, delete it
        if (room.users.size === 0) {
          rooms.delete(roomId);
        } else {
          // If host left, assign new host
          if (room.host === socket.id) {
            const newHost = Array.from(room.users.keys())[0];
            room.host = newHost;
            const user = room.users.get(newHost);
            if (user) {
              user.isHost = true;
            }
          }
          
          // Send updated user list to remaining users
          const userList = Array.from(room.users.values());
          io.to(roomId).emit('userJoined', userList);
          
          // If voting is active, check if all remaining users have voted
          if (room.isVotingActive) {
            const totalUsers = room.users.size;
            const votedUsers = Array.from(room.users.values()).filter(u => u.vote !== null).length;
            
            if (votedUsers === totalUsers) {
              const votes = Array.from(room.votes.values());
              const numericVotes = votes.filter(v => v !== '☕' && v !== '?' && !isNaN(v)).map(Number);
              
              let result = {
                votes: Array.from(room.votes.entries()).map(([userId, vote]) => ({
                  username: room.users.get(userId).username,
                  vote
                })),
                average: 0,
                coffeeBreaks: votes.filter(v => v === '☕').length,
                unsureVotes: votes.filter(v => v === '?').length
              };

              if (numericVotes.length > 0) {
                const sum = numericVotes.reduce((a, b) => a + b, 0);
                result.average = (sum / numericVotes.length).toFixed(1);
              }

              io.to(roomId).emit('votingComplete', result);
            }
          }
        }
        
        // Notify other users about the disconnection
        socket.to(roomId).emit('userDisconnected', socket.id);
        break;
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 