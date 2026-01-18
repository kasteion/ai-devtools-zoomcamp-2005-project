const LeaderboardScreen = ({ entries, loading, error, onRefresh }) => {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Leaderboard</h2>
        <span className="turn-indicator">Top 10</span>
      </div>
      <p className="panel-subtitle">Top players ranked by wins.</p>
      <div className="controls">
        <button type="button" onClick={onRefresh} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      {error && <p className="auth-error">{error}</p>}
      {entries?.length ? (
        <div className="leaderboard">
          {entries.map((entry, index) => (
            <div className="leaderboard-row" key={entry.userId}>
              <span className="leaderboard-rank">#{index + 1}</span>
              <span className="leaderboard-name">{entry.username}</span>
              <span className="leaderboard-wins">{entry.wins} wins</span>
            </div>
          ))}
        </div>
      ) : (
        !loading && <p className="panel-subtitle">No leaderboard data.</p>
      )}
    </section>
  );
};

export default LeaderboardScreen;
