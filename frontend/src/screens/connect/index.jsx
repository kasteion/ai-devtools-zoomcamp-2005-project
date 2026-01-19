const ConnectScreen = ({ playerName, setPlayerName, handleConnect }) => {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Connect</h2>
        <span className="turn-indicator">Step 1</span>
      </div>
      <p className="panel-subtitle">Enter your name and connect.</p>
      <div className="controls">
        <input
          className="input"
          type="text"
          value={playerName}
          onChange={(event) => setPlayerName(event.target.value)}
          placeholder="Player name"
        />
        <button type="button" onClick={handleConnect}>
          Connect
        </button>
      </div>
    </section>
  );
};

export default ConnectScreen;
