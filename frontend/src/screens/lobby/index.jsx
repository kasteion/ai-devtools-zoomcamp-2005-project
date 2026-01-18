const LobbyScreen = ({ handleCreateRoom, handleJoinRoom, availableRooms }) => {
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
      </div>
      <div className="room-list">
        <h3 className="panel-subtitle">Available rooms</h3>
        {availableRooms?.length ? (
          <ul className="room-list-items">
            {availableRooms.map((room) => (
              <li key={room.roomId} className="room-list-item">
                <div>
                  <strong>{room.roomId}</strong>
                  <span className="room-meta">
                    {room.players?.length ?? 0}/2 • {room.phase}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleJoinRoom(room.roomId)}
                >
                  Join
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="panel-subtitle">No rooms available yet.</p>
        )}
      </div>
    </section>
  );
};

export default LobbyScreen;
