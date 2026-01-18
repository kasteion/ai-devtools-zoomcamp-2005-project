const StatsScreen = ({ stats, loading, error, onRefresh }) => {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Your Stats</h2>
        <span className="turn-indicator">Profile</span>
      </div>
      <p className="panel-subtitle">Battleship performance overview.</p>
      <div className="controls">
        <button type="button" onClick={onRefresh} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      {error && <p className="auth-error">{error}</p>}
      {stats && (
        <div className="stats">
          <div className="stat">
            <span className="stat-label">Games played</span>
            <span className="stat-value">{stats.gamesPlayed}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Wins</span>
            <span className="stat-value">{stats.wins}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Losses</span>
            <span className="stat-value">{stats.losses}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Hits</span>
            <span className="stat-value">{stats.hits}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Misses</span>
            <span className="stat-value">{stats.misses}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Shots fired</span>
            <span className="stat-value">{stats.shotsFired}</span>
          </div>
        </div>
      )}
      {!stats && !loading && !error && (
        <p className="panel-subtitle">No stats available yet.</p>
      )}
    </section>
  );
};

export default StatsScreen;
