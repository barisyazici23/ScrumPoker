import React, { useEffect, useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import socketService from '../services/socket';

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

const getPositionStyle = (index, total) => {
  const angle = (index * (360 / total) - 90) * (Math.PI / 180);
  const radius = Math.max(250, total * 50);
  const centerX = radius * Math.cos(angle);
  const centerY = radius * Math.sin(angle);

  return {
    position: 'absolute',
    left: `calc(50% + ${centerX}px)`,
    top: `calc(50% + ${centerY}px)`,
    transform: 'translate(-50%, -50%)',
  };
};

function PokerTable({ roomState, setRoomState }) {
  const [votingResult, setVotingResult] = useState(null);

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

    socketService.instance?.on('votingComplete', (result) => {
      console.log('Voting complete:', result);
      setVotingResult(result);
    });

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

    return () => {
      socketService.instance?.off('votingComplete');
      socketService.instance?.off('voteUpdate');
      socketService.instance?.off('votingStarted');
      socketService.instance?.off('votingEnded');
      socketService.instance?.off('userJoined');
    };
  }, []);

  const handleStartVoting = async () => {
    try {
      if (!roomState.room?.id || !roomState.currentUser?.isHost) {
        return;
      }
      await socketService.startVoting(roomState.room.id);
      setVotingResult(null);
      setRoomState(prev => ({
        ...prev,
        room: {
          ...prev.room,
          users: prev.room.users.map(user => ({
            ...user,
            vote: null
          }))
        }
      }));
    } catch (err) {
      console.error('Error starting voting:', err);
    }
  };

  const handleEndVoting = async () => {
    try {
      if (!roomState.room?.id || !roomState.currentUser?.isHost) {
        return;
      }
      await socketService.endVoting(roomState.room.id);
    } catch (err) {
      console.error('Error ending voting:', err);
    }
  };

  const handleVote = async (value) => {
    try {
      if (!roomState.room?.isVotingActive) {
        return;
      }
      await socketService.vote(roomState.room.id, value);
      setRoomState(prev => ({
        ...prev,
        currentUser: {
          ...prev.currentUser,
          vote: value
        }
      }));
    } catch (err) {
      console.error('Error voting:', err);
    }
  };

  if (!roomState?.room) {
    console.log('No room state available');
    return null;
  }

  // Get users array from roomState
  const users = Array.isArray(roomState.room.users) ? roomState.room.users : Object.values(roomState.room.users);

  console.log('Rendering poker table with users:', users);

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      backgroundColor: '#f5f5f5', 
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Room Info */}
      <Box
        sx={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 2rem',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          borderRadius: '8px',
          color: 'white',
          minWidth: '200px',
        }}
      >
        <Typography variant="h6">Oda: {roomState.room.id}</Typography>
        {roomState.currentUser?.isHost && (
          <Button
            variant="contained"
            color={roomState.room.isVotingActive ? "error" : "success"}
            onClick={roomState.room.isVotingActive ? handleEndVoting : handleStartVoting}
            sx={{ ml: 2 }}
          >
            {roomState.room.isVotingActive ? "Oylamayı Bitir" : "Oylama Başlat"}
          </Button>
        )}
      </Box>

      {/* Poker Table */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '80%',
        maxWidth: '800px',
        height: '500px',
        backgroundColor: '#1B5E20',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        border: '2px solid #2E7D32',
      }}>
        <Typography variant="h4" sx={{ color: 'white', mb: 2 }}>
          Scrum Poker
        </Typography>
        <Typography variant="subtitle1" sx={{ color: 'white' }}>
          {users.length} Kullanıcı
        </Typography>
      </div>

      {/* Users */}
      {users.map((user, index) => (
        <div
          key={user.id}
          style={{
            ...getPositionStyle(index, users.length),
            position: 'absolute',
            zIndex: 2,
          }}
        >
          <div style={{
            backgroundColor: 'white',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            minWidth: '120px',
            border: user.isHost ? '2px solid #2196f3' : user.vote !== null ? '2px solid #4caf50' : '2px solid transparent'
          }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              {user.username}
              {user.isHost && " 👑"}
            </Typography>
            {roomState.room.isVotingActive && (
              <div style={{ marginTop: '8px' }}>
                <div style={{
                  width: '40px',
                  height: '60px',
                  margin: '0 auto',
                  backgroundColor: user.vote !== null ? '#E8F5E9' : '#f0f0f0',
                  border: '2px solid #1B5E20',
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                  color: '#1B5E20',
                }}>
                  {!roomState.room.isVotingActive && user.vote ? user.vote : (user.vote && roomState.room.isVotingActive ? '✓' : '?')}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Voting Controls */}
      {roomState.room.isVotingActive && !roomState.currentUser?.vote && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '8px',
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          zIndex: 1000,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {FIBONACCI.map((number) => (
            <Button
              key={number}
              variant={roomState.currentUser?.vote === number ? 'contained' : 'outlined'}
              color={roomState.currentUser?.vote === number ? 'success' : 'primary'}
              onClick={() => handleVote(number)}
              sx={{ minWidth: '48px', height: '48px', margin: '4px' }}
            >
              {number}
            </Button>
          ))}
          <Button
            variant={roomState.currentUser?.vote === '☕' ? 'contained' : 'outlined'}
            color={roomState.currentUser?.vote === '☕' ? 'success' : 'primary'}
            onClick={() => handleVote('☕')}
            sx={{ 
              minWidth: '48px',
              height: '48px',
              margin: '4px',
              backgroundColor: roomState.currentUser?.vote === '☕' ? '#795548' : 'transparent',
              color: roomState.currentUser?.vote === '☕' ? 'white' : '#795548',
              '&:hover': {
                backgroundColor: '#5D4037',
                color: 'white'
              },
            }}
          >
            ☕
          </Button>
        </div>
      )}

      {/* Voting Results */}
      {votingResult && !roomState.room.isVotingActive && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          padding: '32px',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          maxWidth: '500px',
          width: '90%',
          zIndex: 2000,
        }}>
          <Typography variant="h5" gutterBottom sx={{ borderBottom: '2px solid #1B5E20', paddingBottom: '8px', color: '#1B5E20' }}>
            Oylama Sonuçları
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            backgroundColor: '#E8F5E9',
            padding: '16px',
            borderRadius: '8px',
            marginY: '16px'
          }}>
            <Typography variant="h6">Ortalama:</Typography>
            <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
              {votingResult.average}
            </Typography>
          </Box>

          {votingResult.coffeeBreaks > 0 && (
            <Box sx={{ 
              backgroundColor: '#795548',
              color: 'white',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '24px' }}>☕</span>
              <Typography>
                Mola İsteyenler: {votingResult.coffeeBreaks}
              </Typography>
            </Box>
          )}

          <Box sx={{ 
            marginTop: '16px',
            maxHeight: '200px',
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#888',
              borderRadius: '4px',
            },
          }}>
            {votingResult.votes.map((vote, index) => (
              <Box 
                key={index}
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px',
                  borderBottom: '1px solid #eee',
                  '&:last-child': {
                    borderBottom: 'none'
                  }
                }}
              >
                <Typography sx={{ fontWeight: 'bold' }}>{vote.username}</Typography>
                <Typography 
                  sx={{ 
                    fontWeight: 'bold',
                    color: vote.vote === '☕' ? '#795548' : '#1B5E20'
                  }}
                >
                  {vote.vote || 'Oy vermedi'}
                </Typography>
              </Box>
            ))}
          </Box>

          <Button
            variant="contained"
            onClick={() => setVotingResult(null)}
            sx={{ 
              marginTop: '24px',
              backgroundColor: '#1B5E20',
              '&:hover': {
                backgroundColor: '#2E7D32'
              }
            }}
            fullWidth
          >
            Kapat
          </Button>
        </div>
      )}
    </div>
  );
}

export default PokerTable; 