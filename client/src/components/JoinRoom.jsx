import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Container, Paper } from '@mui/material';
import socketService from '../services/socket';

const JoinRoom = ({ setRoomState }) => {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateRoom = async () => {
    if (!username) {
      setError('Lütfen kullanıcı adı girin');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const newRoomId = await socketService.createRoom();
      const response = await socketService.joinRoom(newRoomId, username);
      
      if (!response.success) {
        throw new Error(response.error || 'Oda oluşturulurken bir hata oluştu');
      }

      setRoomState({
        currentUser: {
          id: socketService.instance.id,
          username,
          isHost: true,
          vote: null
        },
        room: {
          id: newRoomId,
          users: response.users,
          isVotingActive: false
        }
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await socketService.joinRoom(roomId, username);
      if (!response.success) {
        throw new Error(response.error || 'Odaya katılırken bir hata oluştu');
      }
      
      setRoomState({
        currentUser: {
          id: socketService.instance.id,
          username,
          isHost: response.isHost,
          vote: null
        },
        room: {
          id: roomId,
          users: response.users,
          isVotingActive: response.roomState.isVotingActive
        }
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Scrum Poker
          </Typography>
          
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          <Box component="form" noValidate sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Kullanıcı Adı"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
            />

            <Box sx={{ mt: 3, mb: 2 }}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={handleCreateRoom}
                disabled={isLoading}
                sx={{ mb: 2 }}
              >
                Yeni Oda Oluştur
              </Button>
            </Box>

            <Typography variant="h6" component="h2" align="center" sx={{ mt: 4, mb: 2 }}>
              veya
            </Typography>

            <TextField
              margin="normal"
              required
              fullWidth
              id="roomId"
              label="Oda ID"
              name="roomId"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              disabled={isLoading}
            />

            <Button
              fullWidth
              variant="outlined"
              color="primary"
              onClick={handleJoinRoom}
              disabled={isLoading}
              sx={{ mt: 2 }}
            >
              Odaya Katıl
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default JoinRoom; 