import React, { useState } from 'react';
import JoinRoom from './components/JoinRoom';
import PokerTable from './components/PokerTable';
import './App.css';

const App = () => {
  const [roomState, setRoomState] = useState({
    currentUser: null,
    room: null
  });

  return (
    <div className="App">
      {!roomState.room ? (
        <JoinRoom setRoomState={setRoomState} />
      ) : (
        <PokerTable roomState={roomState} setRoomState={setRoomState} />
      )}
    </div>
  );
};

export default App; 