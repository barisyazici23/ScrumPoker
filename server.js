const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 4001;

// Aktif odaları ve kullanıcıları tutacak veri yapısı
const rooms = new Map();

// Socket.io bağlantı yönetimi
io.on('connection', (socket) => {
    console.log('Yeni kullanıcı bağlandı:', socket.id);

    // Odaya katılma
    socket.on('joinRoom', ({ roomId, username, isHost }) => {
        console.log('Join request:', { roomId, username, isHost });
        
        // Oda ID kontrolü
        if (!isHost && !rooms.has(roomId)) {
            console.log('Room not found:', roomId);
            socket.emit('roomError', {
                message: 'Oda bulunamadı! Lütfen oda ID\'sini kontrol edin.'
            });
            return;
        }
        
        socket.join(roomId);
        
        // Oda yoksa oluştur (sadece host için)
        if (!rooms.has(roomId)) {
            console.log('Creating new room:', roomId);
            rooms.set(roomId, {
                users: [],
                host: socket.id
            });
        }

        const room = rooms.get(roomId);
        
        // Kullanıcıyı odaya ekle
        const user = {
            id: socket.id,
            username,
            isHost
        };
        room.users.push(user);
        
        console.log('Room users:', room.users);

        // Odadaki tüm kullanıcılara güncel listeyi gönder
        io.to(roomId).emit('updateUsers', {
            users: room.users,
            count: room.users.length
        });

        // Başarılı katılım bildirimi
        socket.emit('joinSuccess', {
            roomId,
            username,
            isHost
        });
    });

    // Odadan ayrılma
    socket.on('disconnecting', () => {
        const socketRooms = Array.from(socket.rooms);
        socketRooms.forEach(roomId => {
            if (rooms.has(roomId)) {
                const room = rooms.get(roomId);
                room.users = room.users.filter(user => user.id !== socket.id);
                
                if (room.users.length === 0) {
                    rooms.delete(roomId);
                } else {
                    io.to(roomId).emit('updateUsers', {
                        users: room.users,
                        count: room.users.length
                    });
                }
            }
        });
    });
});

// Statik dosyaları serve et
app.use(express.static(path.join(__dirname, 'client/src')));

// Ana route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/src/index.html'));
});

// Sunucuyu başlatırken hata yakalama ekleyelim
const startServer = async () => {
    try {
        await new Promise((resolve, reject) => {
            server.listen(PORT, () => {
                console.log(`Server running on port ${PORT}`);
                resolve();
            });

            server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    console.log(`Port ${PORT} is busy, trying ${PORT + 1}`);
                    server.listen(PORT + 1);
                } else {
                    reject(error);
                }
            });
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer(); 