import React, { useEffect, useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import socketService from '../services/socket';
import '../styles/PokerTable.css';

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
    <div className="poker-table">
      <div className="center-info">
        <h1>Scrum Poker</h1>
        <p>{users.length} Kullanıcı</p>
      </div>
      
      {/* Oyuncu pozisyonları */}
      {users.map((user, index) => (
        <div key={user.id} className={`player-position position-${index}`}>
          <div className="player-avatar">
            <span>{user.username.charAt(0)}</span>
          </div>
          <div className="player-name">
            {user.username}
            {user.isHost && " 👑"}
          </div>
          <div className="player-card">
            {roomState.room.isVotingActive && user.vote !== null ? user.vote : (user.vote && roomState.room.isVotingActive ? '✓' : '?')}
          </div>
        </div>
      ))}

      {/* Diğer pozisyonlar için placeholder */}
      {[...Array(Math.max(0, 10 - users.length)).keys()].map((position) => (
        <div key={position} className={`player-position position-${users.length + position}`}>
          <div className="player-avatar">
            <span>?</span>
          </div>
        </div>
      ))}

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

      {/* Voting Controls */}
      {roomState.room.isVotingActive && !roomState.currentUser?.vote && (
        <div className="voting-controls">
          {FIBONACCI.map((number) => (
            <button
              key={number}
              className={roomState.currentUser?.vote === number ? 'selected' : ''}
              onClick={() => handleVote(number)}
            >
              {number}
            </button>
          ))}
          <button
            className={roomState.currentUser?.vote === '☕' ? 'selected' : ''}
            onClick={() => handleVote('☕')}
          >
            ☕
          </button>
        </div>
      )}

      {/* Voting Results */}
      {votingResult && !roomState.room.isVotingActive && (
        <div className="voting-results">
          <h2>Oylama Sonuçları</h2>
          
          <div className="result-item">
            <span>Ortalama:</span>
            <strong>{votingResult.average}</strong>
          </div>

          {votingResult.coffeeBreaks > 0 && (
            <div className="result-item">
              <span>Mola İsteyenler:</span>
              <strong>{votingResult.coffeeBreaks}</strong>
            </div>
          )}

          <div className="votes">
            {votingResult.votes.map((vote, index) => (
              <div key={index} className="vote-item">
                <span>{vote.username}</span>
                <strong>{vote.vote || 'Oy vermedi'}</strong>
              </div>
            ))}
          </div>

          <button
            onClick={() => setVotingResult(null)}
          >
            Kapat
          </button>
        </div>
      )}
    </div>
  );
}

export default PokerTable; 