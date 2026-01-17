const LobbyScreen = ({
  handleCreateRoom,
  roomIdInput,
  setRoomIdInput,
  handleJoinRoom,
}) => {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Room Lobby</h2>
        <span className="turn-indicator">Step 2</span>
      </div>
      <p className="panel-subtitle">Create a new room or join one.</p>
      <div className="controls">
        <button type="button" onClick={handleCreateRoom}>
          Create Room
        </button>
        <input
          type="text"
          value={roomIdInput}
          onChange={(event) => setRoomIdInput(event.target.value)}
          placeholder="Room ID"
        />
        <button type="button" onClick={handleJoinRoom}>
          Join Room
        </button>
      </div>
    </section>
  );
};

export default LobbyScreen;
