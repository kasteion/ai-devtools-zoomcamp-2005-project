import { useEffect, useMemo, useState } from "react";
import "./App.css";

const BOARD_SIZE = 10;
const SHIPS = [
  { name: "Carrier", size: 5 },
  { name: "Battleship", size: 4 },
  { name: "Cruiser", size: 3 },
  { name: "Submarine", size: 3 },
  { name: "Destroyer", size: 2 },
];

const createEmptyBoard = () =>
  Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ({
      shipId: null,
      isHit: false,
    }))
  );

const coordsInBounds = (row, col) =>
  row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;

const canPlaceShip = (board, row, col, size, orientation) => {
  for (let i = 0; i < size; i += 1) {
    const r = orientation === "H" ? row : row + i;
    const c = orientation === "H" ? col + i : col;
    if (!coordsInBounds(r, c)) return false;
    if (board[r][c].shipId !== null) return false;
  }
  return true;
};

const placeShip = (board, shipId, size, row, col, orientation) => {
  const next = board.map((line) => line.map((cell) => ({ ...cell })));
  const coords = [];
  for (let i = 0; i < size; i += 1) {
    const r = orientation === "H" ? row : row + i;
    const c = orientation === "H" ? col + i : col;
    next[r][c].shipId = shipId;
    coords.push([r, c]);
  }
  return { board: next, coords };
};

const randomInt = (max) => Math.floor(Math.random() * max);

const randomlyPlaceShips = () => {
  let board = createEmptyBoard();
  const ships = SHIPS.map((ship) => ({
    ...ship,
    positions: [],
    hits: 0,
  }));

  ships.forEach((ship, shipId) => {
    let placed = false;
    while (!placed) {
      const orientation = Math.random() > 0.5 ? "H" : "V";
      const row = randomInt(BOARD_SIZE);
      const col = randomInt(BOARD_SIZE);
      if (canPlaceShip(board, row, col, ship.size, orientation)) {
        const result = placeShip(
          board,
          shipId,
          ship.size,
          row,
          col,
          orientation
        );
        board = result.board;
        ships[shipId].positions = result.coords;
        placed = true;
      }
    }
  });

  return { board, ships };
};

const countShipsSunk = (ships) =>
  ships.filter((ship) => ship.hits >= ship.size).length;

const countShipsHit = (ships) => ships.filter((ship) => ship.hits > 0).length;

const calculateStats = (state) => {
  const hits = state.shots.filter((shot) => shot.result === "hit").length;
  const misses = state.shots.filter((shot) => shot.result === "miss").length;
  const shipsSunk = countShipsSunk(state.ships);
  const shipsHit = countShipsHit(state.ships);
  const shipsRemaining = state.ships.length - shipsSunk;
  return {
    hits,
    misses,
    shipsSunk,
    shipsRemaining,
    shipsHit,
    shipsPlaced: state.ships.length,
  };
};

const createPlayerState = (board, ships) => ({
  board,
  ships,
  shots: [],
  turns: 0,
});

const computeShotResult = (board, row, col, ships) => {
  const cell = board[row][col];
  if (cell.isHit) return { result: "repeat", shipId: cell.shipId };
  if (cell.shipId === null) return { result: "miss", shipId: null };
  const ship = ships[cell.shipId];
  const isSunk = ship.hits + 1 >= ship.size;
  return { result: "hit", shipId: cell.shipId, isSunk };
};

const applyShot = (state, row, col) => {
  const nextBoard = state.board.map((line) =>
    line.map((cell) => ({ ...cell }))
  );
  const nextShips = state.ships.map((ship) => ({ ...ship }));
  const shotResult = computeShotResult(state.board, row, col, state.ships);

  if (shotResult.result === "repeat") {
    return { nextState: state, shotResult };
  }

  nextBoard[row][col].isHit = true;
  if (shotResult.result === "hit" && shotResult.shipId !== null) {
    nextShips[shotResult.shipId].hits += 1;
  }

  const nextShots = state.shots.concat({ row, col, result: shotResult.result });
  const nextState = {
    ...state,
    board: nextBoard,
    ships: nextShips,
    shots: nextShots,
    turns: state.turns + 1,
  };

  return { nextState, shotResult };
};

const createEmptyPlacement = () => ({
  board: createEmptyBoard(),
  ships: SHIPS.map((ship) => ({ ...ship, positions: [], hits: 0 })),
});

const initialPlacement = createEmptyPlacement();

const getCellKey = (row, col) => `${row}-${col}`;

function App() {
  const [placement, setPlacement] = useState(initialPlacement);
  const [currentShipIndex, setCurrentShipIndex] = useState(0);
  const [orientation, setOrientation] = useState("H");
  const [player, setPlayer] = useState(null);
  const [computer, setComputer] = useState(null);
  const [currentTurn, setCurrentTurn] = useState("player");
  const [winner, setWinner] = useState(null);
  const [message, setMessage] = useState("Place your fleet to start the game.");

  const remainingToPlace = SHIPS.length - currentShipIndex;

  const playerStats = useMemo(
    () => (player ? calculateStats(player) : null),
    [player]
  );
  const computerStats = useMemo(
    () => (computer ? calculateStats(computer) : null),
    [computer]
  );

  const handleToggleOrientation = () => {
    setOrientation((prev) => (prev === "H" ? "V" : "H"));
  };

  const handleManualPlacement = (row, col) => {
    if (player) return;
    if (currentShipIndex >= SHIPS.length) return;
    const ship = SHIPS[currentShipIndex];
    if (!canPlaceShip(placement.board, row, col, ship.size, orientation)) {
      setMessage("Invalid placement. Try another position or orientation.");
      return;
    }

    const result = placeShip(
      placement.board,
      currentShipIndex,
      ship.size,
      row,
      col,
      orientation
    );
    const nextShips = placement.ships.map((s, index) =>
      index === currentShipIndex ? { ...s, positions: result.coords } : s
    );
    const nextPlacement = {
      board: result.board,
      ships: nextShips,
    };
    setPlacement(nextPlacement);

    const nextIndex = currentShipIndex + 1;
    setCurrentShipIndex(nextIndex);
    if (nextIndex >= SHIPS.length) {
      setMessage("Fleet ready! Start the battle.");
    } else {
      setMessage(`Placed ${ship.name}. Place ${SHIPS[nextIndex].name}.`);
    }
  };

  const handleAutoPlace = () => {
    if (player) return;
    const auto = randomlyPlaceShips();
    setPlacement({ board: auto.board, ships: auto.ships });
    setCurrentShipIndex(SHIPS.length);
    setMessage("Fleet placed automatically. Start the battle.");
  };

  const startGame = () => {
    if (player) return;
    if (currentShipIndex < SHIPS.length) {
      setMessage("Place all ships before starting the game.");
      return;
    }
    const enemy = randomlyPlaceShips();
    setPlayer(createPlayerState(placement.board, placement.ships));
    setComputer(createPlayerState(enemy.board, enemy.ships));
    setCurrentTurn("player");
    setWinner(null);
    setMessage("Battle started! Fire on the enemy grid.");
  };

  const checkWinner = (nextPlayer, nextComputer) => {
    if (countShipsSunk(nextComputer.ships) === nextComputer.ships.length) {
      setWinner("player");
      setMessage("You win! All enemy ships have been sunk.");
      return true;
    }
    if (countShipsSunk(nextPlayer.ships) === nextPlayer.ships.length) {
      setWinner("computer");
      setMessage("The computer wins! Your fleet was sunk.");
      return true;
    }
    return false;
  };

  const handlePlayerShot = (row, col) => {
    if (!player || !computer) return;
    if (winner) return;
    if (currentTurn !== "player") return;
    const { nextState: nextComputer, shotResult } = applyShot(
      computer,
      row,
      col
    );
    if (shotResult.result === "repeat") {
      setMessage("You already fired there. Choose another target.");
      return;
    }
    setComputer(nextComputer);
    setMessage(
      shotResult.result === "hit"
        ? `Hit! ${
            shotResult.isSunk
              ? "You sunk a ship!"
              : "Fire again after computer turn."
          }`
        : "Miss! Computer is firing..."
    );
    const hasWinner = checkWinner(player, nextComputer);
    if (!hasWinner) {
      setCurrentTurn("computer");
    }
  };

  const handleComputerShot = () => {
    if (!player || !computer) return;
    if (winner) return;
    if (currentTurn !== "computer") return;

    let row = randomInt(BOARD_SIZE);
    let col = randomInt(BOARD_SIZE);
    let attempts = 0;
    while (attempts < 200 && player.board[row][col].isHit) {
      row = randomInt(BOARD_SIZE);
      col = randomInt(BOARD_SIZE);
      attempts += 1;
    }

    const { nextState: nextPlayer, shotResult } = applyShot(player, row, col);
    setPlayer(nextPlayer);
    setMessage(
      shotResult.result === "hit"
        ? `Computer hit your ship at ${row + 1}, ${col + 1}.`
        : `Computer missed at ${row + 1}, ${col + 1}. Your turn.`
    );
    const hasWinner = checkWinner(nextPlayer, computer);
    if (!hasWinner) {
      setCurrentTurn("player");
    }
  };

  useEffect(() => {
    if (!player || !computer) return;
    if (winner) return;
    if (currentTurn !== "computer") return;
    const timer = window.setTimeout(() => {
      handleComputerShot();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [player, computer, currentTurn, winner]);

  const handleReset = () => {
    setPlacement(createEmptyPlacement());
    setCurrentShipIndex(0);
    setOrientation("H");
    setPlayer(null);
    setComputer(null);
    setCurrentTurn("player");
    setWinner(null);
    setMessage("Place your fleet to start the game.");
  };

  const getCellStatus = (cell, hideShips) => {
    if (cell.isHit && cell.shipId !== null) return "hit";
    if (cell.isHit && cell.shipId === null) return "miss";
    if (!hideShips && cell.shipId !== null) return "ship";
    return "empty";
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">Battleship Command</p>
          <h1>Battleship</h1>
          <p className="status">{message}</p>
        </div>
        <div className="controls">
          <button
            type="button"
            onClick={handleToggleOrientation}
            disabled={!!player}
          >
            Orientation: {orientation === "H" ? "Horizontal" : "Vertical"}
          </button>
          <button type="button" onClick={handleAutoPlace} disabled={!!player}>
            Auto-place Fleet
          </button>
          <button type="button" onClick={startGame} disabled={!!player}>
            Start Battle
          </button>
          <button type="button" onClick={handleReset}>
            Reset Game
          </button>
        </div>
      </header>
      {winner && (
        <div className="winner-banner">
          Winner: {winner === "player" ? "You" : "Computer"}
        </div>
      )}

      <main className="layout">
        {computer && (
          <section className="panel">
            <div className="panel-header">
              <h2>Enemy Waters</h2>
              <span className="turn-indicator">
                {currentTurn === "computer" ? "Computer turn" : "Ready"}
              </span>
            </div>
            <p className="panel-subtitle">
              Fire on the enemy grid to locate ships.
            </p>
            <div className="board">
              {computer?.board.map((row, rowIndex) => (
                <div className="row" key={`enemy-row-${rowIndex}`}>
                  {row.map((cell, colIndex) => (
                    <button
                      key={`enemy-${getCellKey(rowIndex, colIndex)}`}
                      type="button"
                      className={`cell ${getCellStatus(cell, true)}`}
                      onClick={() => handlePlayerShot(rowIndex, colIndex)}
                      disabled={!player || winner || currentTurn !== "player"}
                    />
                  ))}
                </div>
              ))}
            </div>
            {computerStats && (
              <div className="stats">
                <Stat label="Hits" value={computerStats.hits} />
                <Stat label="Misses" value={computerStats.misses} />
                <Stat label="Ships hit" value={computerStats.shipsHit} />
                <Stat label="Ships sunk" value={computerStats.shipsSunk} />
                <Stat
                  label="Ships remaining"
                  value={computerStats.shipsRemaining}
                />
                <Stat label="Ships placed" value={computerStats.shipsPlaced} />
                <Stat label="Turns taken" value={computer.turns} />
                <Stat label="Ships to place" value={0} />
              </div>
            )}
            {!computerStats && (
              <div className="stats">
                <Stat label="Ships placed" value={0} />
                <Stat label="Ships remaining to place" value={SHIPS.length} />
                <Stat label="Ships hit" value={0} />
              </div>
            )}
          </section>
        )}

        <section className="panel">
          <div className="panel-header">
            <h2>Your Fleet</h2>
            <span className="turn-indicator">
              {currentTurn === "player" ? "Your turn" : "Waiting"}
            </span>
          </div>

          <p className="panel-subtitle">
            {player
              ? "Defend your ships and track incoming fire."
              : `Place ${remainingToPlace} ship${
                  remainingToPlace === 1 ? "" : "s"
                } (${
                  currentShipIndex < SHIPS.length
                    ? SHIPS[currentShipIndex].name
                    : "ready"
                })`}
          </p>
          <div className="board">
            {placement.board.map((row, rowIndex) => (
              <div className="row" key={`player-row-${rowIndex}`}>
                {row.map((cell, colIndex) => (
                  <button
                    key={`player-${getCellKey(rowIndex, colIndex)}`}
                    type="button"
                    className={`cell ${getCellStatus(
                      player ? player.board[rowIndex][colIndex] : cell,
                      false
                    )}`}
                    onClick={() => handleManualPlacement(rowIndex, colIndex)}
                    disabled={!!player}
                  />
                ))}
              </div>
            ))}
          </div>
          {playerStats && (
            <div className="stats">
              <Stat label="Hits" value={playerStats.hits} />
              <Stat label="Misses" value={playerStats.misses} />
              <Stat label="Ships hit" value={playerStats.shipsHit} />
              <Stat label="Ships sunk" value={playerStats.shipsSunk} />
              <Stat
                label="Ships remaining"
                value={playerStats.shipsRemaining}
              />
              <Stat label="Ships placed" value={playerStats.shipsPlaced} />
              <Stat label="Turns taken" value={player.turns} />
              <Stat label="Ships to place" value={0} />
            </div>
          )}
          {!playerStats && (
            <div className="stats">
              <Stat label="Ships placed" value={currentShipIndex} />
              <Stat label="Ships remaining to place" value={remainingToPlace} />
              <Stat
                label="Orientation"
                value={orientation === "H" ? "Horizontal" : "Vertical"}
              />
            </div>
          )}
        </section>
      </main>

      {player && computer && currentTurn === "computer" && !winner && (
        <div className="computer-turn">
          <span className="status">Computer is firing...</span>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

export default App;
