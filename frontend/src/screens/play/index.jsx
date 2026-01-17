import { Stat } from "../../components";

const PlayScreen = ({
  isMyTurn,
  createEmptyBoard,
  getCellKey,
  getEnemyCellStatus,
  handlePlayerShot,
  isInRoom,
  winner,
  enemyFog,
  placement,
  getSelfCellStatus,
  selfGrid,
}) => {
  return (
    <main className="layout">
      <section className="panel">
        <div className="panel-header">
          <h2>Enemy Waters</h2>
          <span className="turn-indicator">
            {isMyTurn ? "Your turn" : "Waiting"}
          </span>
        </div>
        <p className="panel-subtitle">
          Fire on the enemy grid to locate ships.
        </p>
        <div className="board">
          {createEmptyBoard().map((row, rowIndex) => (
            <div className="row" key={`enemy-row-${rowIndex}`}>
              {row.map((cell, colIndex) => (
                <button
                  key={`enemy-${getCellKey(rowIndex, colIndex)}`}
                  type="button"
                  className={`cell ${getEnemyCellStatus(rowIndex, colIndex)}`}
                  onClick={() => handlePlayerShot(rowIndex, colIndex)}
                  disabled={!isInRoom || winner || !isMyTurn}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="stats">
          <Stat label="Shots" value={enemyFog.shots.length} />
          <Stat label="Ships sunk" value={enemyFog.shipsSunk} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Your Fleet</h2>
          <span className="turn-indicator">
            {isMyTurn ? "Your" : "Their"} turn
          </span>
        </div>
        <p className="panel-subtitle">
          Defend your ships and track incoming fire.
        </p>
        <div className="board">
          {placement.board.map((row, rowIndex) => (
            <div className="row" key={`player-row-${rowIndex}`}>
              {row.map((cell, colIndex) => (
                <button
                  key={`player-${getCellKey(rowIndex, colIndex)}`}
                  type="button"
                  className={`cell ${getSelfCellStatus(
                    rowIndex,
                    colIndex,
                    cell
                  )}`}
                  disabled
                />
              ))}
            </div>
          ))}
        </div>
        <div className="stats">
          <Stat label="Hits taken" value={selfGrid.hits.length} />
          <Stat label="Misses" value={selfGrid.misses.length} />
          <Stat label="Ships" value={selfGrid.ships.length} />
        </div>
      </section>
    </main>
  );
};

export default PlayScreen;
