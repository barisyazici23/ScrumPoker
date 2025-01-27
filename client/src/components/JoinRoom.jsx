import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Container, Paper } from '@mui/material';
import socketService from '../services/socket';

const JoinRoom = ({ setRoomState }) => {
  const [createUsername, setCreateUsername] = useState('');
  const [joinUsername, setJoinUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateRoom = async () => {
    if (!createUsername) {
      setError('Lütfen kullanıcı adı girin');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const newRoomId = await socketService.createRoom();
      const response = await socketService.joinRoom(newRoomId, createUsername);
      
      if (!response.success) {
        throw new Error(response.error || 'Oda oluşturulurken bir hata oluştu');
      }

      setRoomState({
        currentUser: {
          id: socketService.instance.id,
          username: createUsername,
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
    if (!joinUsername) {
      setError('Lütfen kullanıcı adı girin');
      return;
    }
    setIsLoading(true);
    try {
      const response = await socketService.joinRoom(roomId, joinUsername);
      if (!response.success) {
        throw new Error(response.error || 'Odaya katılırken bir hata oluştu');
      }
      
      setRoomState({
        currentUser: {
          id: socketService.instance.id,
          username: joinUsername,
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
    <Box sx={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#3F51B5',
      position: 'fixed',
      top: 0,
      left: 0
    }}>
      <Box sx={{ 
        width: '100%',
        maxWidth: '1000px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Paper elevation={4} sx={{
          width: '100%',
          maxWidth: '1000px',
          margin: '0 auto',
          padding: '64px',
          borderRadius: '24px',
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        }}>
          <Typography variant="h3" sx={{
            textAlign: 'center',
            fontWeight: 'bold',
            color: '#3F51B5',
            marginBottom: '48px',
            textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
          }}>
            Scrum Poker
          </Typography>
          
          {error && (
            <Box sx={{
              p: 2,
              mb: 3,
              borderRadius: '12px',
              backgroundColor: 'rgba(211, 47, 47, 0.1)',
              border: '1px solid rgba(211, 47, 47, 0.3)'
            }}>
              <Typography color="error" align="center">
                {error}
              </Typography>
            </Box>
          )}

          <Box component="form" noValidate sx={{ textAlign: 'center' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Kullanıcı Adı"
              value={createUsername}
              onChange={(e) => setCreateUsername(e.target.value)}
              disabled={isLoading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  '&:hover fieldset': {
                    borderColor: '#3F51B5',
                  },
                },
                mb: 3
              }}
            />

            <Button
              fullWidth
              variant="contained"
              onClick={handleCreateRoom}
              disabled={isLoading || !createUsername}
              sx={{
                mt: 2,
                mb: 4,
                py: 2,
                borderRadius: '12px',
                backgroundColor: '#3F51B5',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: '#303F9F',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(63, 81, 181, 0.4)',
                },
                transition: 'all 0.2s ease',
                opacity: createUsername ? 1 : 0.7
              }}
            >
              Yeni Oda Oluştur
            </Button>

            <Box sx={{
              position: 'relative',
              textAlign: 'center',
              my: 4,
              '&::before, &::after': {
                content: '""',
                position: 'absolute',
                top: '50%',
                width: '40%',
                height: '1px',
                backgroundColor: 'rgba(0,0,0,0.1)',
              },
              '&::before': {
                left: 0,
              },
              '&::after': {
                right: 0,
              },
            }}>
              <Typography
                variant="body1"
                component="span"
                sx={{
                  px: 2,
                  color: 'rgba(0,0,0,0.5)',
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                }}
              >
                veya
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>
                Mevcut Odaya Katıl
              </Typography>
              
              <TextField
                margin="normal"
                required
                fullWidth
                label="Kullanıcı Adı"
                value={joinUsername}
                onChange={(e) => setJoinUsername(e.target.value)}
                disabled={isLoading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    '&:hover fieldset': {
                      borderColor: '#3F51B5',
                    },
                  },
                  mb: 2
                }}
              />

              <TextField
                required
                fullWidth
                label="Oda ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                disabled={isLoading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    '&:hover fieldset': {
                      borderColor: '#3F51B5',
                    },
                  },
                }}
              />
            </Box>

            <Button
              fullWidth
              variant="outlined"
              onClick={handleJoinRoom}
              disabled={isLoading || !joinUsername || !roomId}
              sx={{
                py: 2,
                borderRadius: '12px',
                borderColor: '#3F51B5',
                color: '#3F51B5',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#303F9F',
                  backgroundColor: 'rgba(63, 81, 181, 0.05)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(63, 81, 181, 0.2)',
                },
                transition: 'all 0.2s ease',
                opacity: (joinUsername && roomId) ? 1 : 0.7
              }}
            >
              Odaya Katıl
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default JoinRoom; 