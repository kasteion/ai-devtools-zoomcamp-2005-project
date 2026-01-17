import { Stat } from "../../components";

const WaitingScreen = ({ roomId, roomPlayers }) => {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Waiting Room</h2>
        <span className="turn-indicator">Step 4</span>
      </div>
      <p className="panel-subtitle">Waiting for opponent to place ships.</p>
      <div className="stats">
        <Stat label="Room" value={roomId ?? "-"} />
        <Stat label="Players" value={roomPlayers.length} />
        <Stat label="Ready" value={roomPlayers.filter((p) => p.ready).length} />
      </div>
    </section>
  );
};

export default WaitingScreen;
