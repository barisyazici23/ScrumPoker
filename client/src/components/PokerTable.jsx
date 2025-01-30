import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Paper, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText } from '@mui/material';
import socketService from '../services/socket';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

const getPositionStyle = (index, total) => {
  const radius = Math.min(window.innerWidth, window.innerHeight) * 0.35;
  
  // Daire üzerinde eşit aralıklı yerleşim
  const angleStep = (2 * Math.PI) / total; // Toplam kullanıcı sayısına göre açı adımı
  // İlk kullanıcı alt ortada (270 derece veya 3π/2) başlar
  const startAngle = (3 * Math.PI) / 2;
  const angle = startAngle + (index * angleStep);

  return {
    position: 'absolute',
    left: `calc(50% + ${radius * Math.cos(angle)}px)`,
    top: `calc(50% + ${radius * Math.sin(angle)}px)`,
    transform: 'translate(-50%, -50%)',
    transition: 'all 0.5s ease-in-out',
  };
};

function PokerTable({ roomState, setRoomState }) {
  const [showResults, setShowResults] = useState(false);
  const [votingResults, setVotingResults] = useState(null);

  useEffect(() => {
    console.log('Current roomState:', roomState);

    socketService.instance?.on('userJoined', (userList) => {
      console.log('User joined, updating user list:', userList);
      setRoomState(prev => ({
        ...prev,
        room: {
          ...prev.room,
          users: userList
        }
      }));
    });

    const handleVotingComplete = (results) => {
      setVotingResults(results);
      setShowResults(true);
    };

    socketService.instance?.on('votingComplete', handleVotingComplete);

    socketService.instance?.on('voteUpdate', ({ totalVotes, expectedVotes, userList }) => {
      console.log('Vote update:', totalVotes, expectedVotes, userList);
      setRoomState(prev => ({
        ...prev,
        room: {
          ...prev.room,
          users: userList
        }
      }));
    });

    socketService.instance?.on('votingStarted', () => {
      console.log('Voting started');
      setRoomState(prev => ({
        ...prev,
        room: {
          ...prev.room,
          isVotingActive: true
        }
      }));
    });

    socketService.instance?.on('votingEnded', () => {
      console.log('Voting ended');
      setRoomState(prev => ({
        ...prev,
        room: {
          ...prev.room,
          isVotingActive: false
        }
      }));
    });

    socketService.instance?.on('userDisconnected', (userId) => {
      if (roomState?.room?.users) {
        const updatedUsers = roomState.room.users.filter(u => u.id !== userId);
        setRoomState(prev => ({
          ...prev,
          room: {
            ...prev.room,
            users: updatedUsers
          }
        }));
      }
    });

    return () => {
      socketService.instance?.off('votingComplete', handleVotingComplete);
      socketService.instance?.off('voteUpdate');
      socketService.instance?.off('votingStarted');
      socketService.instance?.off('votingEnded');
      socketService.instance?.off('userJoined');
      socketService.instance?.off('userDisconnected');
    };
  }, [roomState, setRoomState]);

  const handleStartVoting = async () => {
    try {
      await socketService.startVoting(roomState.room.id);
      setShowResults(false);
      setVotingResults(null);
    } catch (err) {
      console.error('Error starting voting:', err);
    }
  };

  const handleEndVoting = async () => {
    try {
      await socketService.endVoting(roomState.room.id);
    } catch (err) {
      console.error('Error ending voting:', err);
    }
  };

  const handleVote = async (value) => {
    try {
      await socketService.vote(roomState.room.id, value);
      setRoomState(prev => ({
        ...prev,
        room: {
          ...prev.room,
          users: prev.room.users.map(u => 
            u.id === roomState.currentUser.id 
              ? { ...u, vote: value }
              : u
          )
        }
      }));
    } catch (err) {
      console.error('Error voting:', err);
    }
  };

  const handleCloseResults = () => {
    setShowResults(false);
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomState.room.id);
  };

  if (!roomState?.room) {
    console.log('No room state available');
    return null;
  }

  // Get users array from roomState
  const users = Array.isArray(roomState.room.users) ? roomState.room.users : Object.values(roomState.room.users);

  console.log('Rendering poker table with users:', users);

  return (
    <Box sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#FAFBFC',
      overflow: 'hidden'
    }}>
      {/* Room Info */}
      <Box sx={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        padding: '16px 24px',
        borderRadius: '16px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 1000,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body1" sx={{ color: '#37474F', fontWeight: 500 }}>
            Oda: {roomState.room.id}
          </Typography>
          <IconButton
            size="small"
            onClick={handleCopyRoomId}
            sx={{
              padding: '4px',
              color: '#546E7A',
              '&:hover': {
                backgroundColor: 'rgba(84, 110, 122, 0.08)',
              }
            }}
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Box>
        {roomState.currentUser?.isHost && (
          <Button
            variant="contained"
            onClick={roomState.room.isVotingActive ? handleEndVoting : handleStartVoting}
            sx={{
              backgroundColor: roomState.room.isVotingActive ? '#EF5350' : '#3F51B5',
              color: 'white',
              '&:hover': {
                backgroundColor: roomState.room.isVotingActive ? '#E53935' : '#303F9F',
              }
            }}
          >
            {roomState.room.isVotingActive ? 'Oylamayı Bitir' : 'Oylamayı Başlat'}
          </Button>
        )}
      </Box>

      {/* Poker Table */}
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '80vw',
        maxWidth: '1200px',
        height: '80vh',
        maxHeight: '800px',
        borderRadius: '40px',
        backgroundColor: '#3F51B5',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px'
      }}>
        <Typography variant="h2" sx={{ 
          color: '#FFFFFF', 
          mb: 3,
          textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
          fontWeight: '500',
          letterSpacing: '1px'
        }}>
          Scrum Poker
        </Typography>
        <Typography variant="h6" sx={{ 
          color: 'rgba(255,255,255,0.9)',
          mb: 2
        }}>
          {users.length} Kullanıcı
        </Typography>
      </Box>

      {/* Users */}
      {users.map((user, index) => (
        <Paper
          key={user.id}
          elevation={4}
          sx={{
            ...getPositionStyle(index, users.length),
            zIndex: 2,
            borderRadius: '16px',
            padding: '16px',
            backgroundColor: 'rgba(250, 250, 250, 0.95)',
            backdropFilter: 'blur(10px)',
            width: '160px',
            maxWidth: '90vw',
            border: user.isHost ? '2px solid #5C6BC0' : user.vote !== null ? '2px solid #78909C' : '2px solid transparent',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translate(-50%, -50%) scale(1.05)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
            }
          }}
        >
          <Typography variant="h6" sx={{ 
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: '#37474F',
            fontSize: { xs: '0.9rem', sm: '1.1rem', md: '1.25rem' }
          }}>
            {user.username}
            {user.isHost && "👑"}
          </Typography>
          {roomState.room.isVotingActive && (
            <Box sx={{ 
              mt: 2,
              display: 'flex',
              justifyContent: 'center'
            }}>
              <Paper elevation={2} sx={{
                width: '60px',
                height: '90px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: user.vote !== null ? '#ECEFF1' : '#FAFAFA',
                border: '2px solid #546E7A',
                borderRadius: '12px',
                fontSize: '1.5rem',
                fontWeight: '500',
                color: '#37474F',
              }}>
                {!roomState.room.isVotingActive && user.vote ? user.vote : (user.vote && roomState.room.isVotingActive ? '✓' : '?')}
              </Paper>
            </Box>
          )}
        </Paper>
      ))}

      {/* Voting Controls */}
      {roomState.room.isVotingActive && !roomState.currentUser?.vote && (
        <Paper elevation={4} sx={{
          position: 'fixed',
          left: '10%',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          padding: '32px',
          borderRadius: '24px',
          backgroundColor: 'rgba(250, 250, 250, 0.98)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
          zIndex: 1000,
        }}>
          {FIBONACCI.map((number) => (
            <Button
              key={number}
              variant={roomState.currentUser?.vote === number ? 'contained' : 'outlined'}
              color={roomState.currentUser?.vote === number ? 'primary' : 'inherit'}
              onClick={() => handleVote(number)}
              sx={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '20px',
                fontSize: '1.5rem',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                backgroundColor: roomState.currentUser?.vote === number ? '#546E7A' : 'transparent',
                borderColor: '#546E7A',
                color: roomState.currentUser?.vote === number ? 'white' : '#546E7A',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  backgroundColor: roomState.currentUser?.vote === number ? '#455A64' : 'rgba(84, 110, 122, 0.08)',
                }
              }}
            >
              {number}
            </Button>
          ))}
          <Button
            variant={roomState.currentUser?.vote === '?' ? 'contained' : 'outlined'}
            color={roomState.currentUser?.vote === '?' ? 'primary' : 'inherit'}
            onClick={() => handleVote('?')}
            sx={{ 
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              fontSize: '1.5rem',
              backgroundColor: roomState.currentUser?.vote === '?' ? '#78909C' : 'transparent',
              borderColor: '#78909C',
              color: roomState.currentUser?.vote === '?' ? 'white' : '#78909C',
              '&:hover': {
                backgroundColor: roomState.currentUser?.vote === '?' ? '#607D8B' : 'rgba(120, 144, 156, 0.08)',
                transform: 'scale(1.05)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              },
            }}
          >
            ?
          </Button>
          <Button
            variant={roomState.currentUser?.vote === '☕' ? 'contained' : 'outlined'}
            color={roomState.currentUser?.vote === '☕' ? 'primary' : 'inherit'}
            onClick={() => handleVote('☕')}
            sx={{ 
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              fontSize: '1.5rem',
              backgroundColor: roomState.currentUser?.vote === '☕' ? '#795548' : 'transparent',
              borderColor: '#795548',
              color: roomState.currentUser?.vote === '☕' ? 'white' : '#795548',
              '&:hover': {
                backgroundColor: roomState.currentUser?.vote === '☕' ? '#5D4037' : 'rgba(121, 85, 72, 0.08)',
                transform: 'scale(1.05)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              },
            }}
          >
            ☕
          </Button>
        </Paper>
      )}

      {/* Voting Results */}
      {showResults && !roomState.room.isVotingActive && (
        <Paper elevation={4} sx={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          padding: '32px',
          borderRadius: '24px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          maxWidth: '600px',
          width: '90%',
          zIndex: 2000,
        }}>
          <Typography variant="h4" gutterBottom sx={{ 
            borderBottom: '3px solid #3F51B5',
            paddingBottom: '16px',
            color: '#3F51B5',
            fontWeight: 'bold'
          }}>
            Oylama Sonuçları
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            backgroundColor: '#E8EAF6',
            padding: '24px',
            borderRadius: '16px',
            marginY: '24px'
          }}>
            <Typography variant="h5" sx={{ color: '#3F51B5' }}>Ortalama:</Typography>
            <Typography variant="h3" sx={{ 
              color: '#3F51B5',
              fontWeight: 'bold'
            }}>
              {votingResults.average}
            </Typography>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#3F51B5' }}>
              Oylar:
            </Typography>
            <Box sx={{ 
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              {users.map((user) => (
                <Chip
                  key={user.id}
                  label={`${user.username}: ${user.vote || '?'}`}
                  color={user.vote === '☕' ? 'default' : 'primary'}
                  variant="outlined"
                  sx={{ 
                    borderRadius: '12px',
                    padding: '16px 12px',
                    fontSize: '1rem'
                  }}
                />
              ))}
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
}

export default PokerTable; 