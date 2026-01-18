import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";

import ConnectScreen from "./screens/connect";
import LobbyScreen from "./screens/lobby";
import "./App.css";
import PlaceScreen from "./screens/place";
import WaitingScreen from "./screens/waiting";
import PlayScreen from "./screens/play";
import { Stat } from "./components";

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

const SERVER_URL = "http://localhost:5175";
const createEmptyFog = () => ({ shots: [], shipsSunk: 0 });
const createEmptySelfGrid = () => ({ hits: [], misses: [], ships: [] });

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

  const [isMultiplayer, setIsMultiplayer] = useState(true);
  const [playerName, setPlayerName] = useState(
    uniqueNamesGenerator({
      dictionaries: [adjectives, colors, animals],
      separator: " ",
    })
  );
  // const [roomIdInput, setRoomIdInput] = useState("");
  const [roomId, setRoomId] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [roomPhase, setRoomPhase] = useState("idle");
  const [activePlayerId, setActivePlayerId] = useState(null);
  const [roomPlayers, setRoomPlayers] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [enemyFog, setEnemyFog] = useState(createEmptyFog());
  const [selfGrid, setSelfGrid] = useState(createEmptySelfGrid());
  const [errorMessage, setErrorMessage] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef(null);
  const playerIdRef = useRef(null);

  const remainingToPlace = SHIPS.length - currentShipIndex;
  const isInRoom = Boolean(roomId && playerId);
  const canStartLocal = !isMultiplayer;
  const isReadyToSubmit = currentShipIndex >= SHIPS.length;
  const isMyTurn = isMultiplayer
    ? activePlayerId && playerId && activePlayerId === playerId
    : currentTurn === "player";
  const isPlayerReady = roomPlayers.find((p) => p.playerId === playerId)?.ready;
  const multiplayerScreen = !isMultiplayer
    ? "local"
    : !isConnected
    ? "connect"
    : !isInRoom
    ? "lobby"
    : roomPhase === "playing" || roomPhase === "finished"
    ? "play"
    : isPlayerReady
    ? "waiting"
    : "place";

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
    setMessage(
      isMultiplayer
        ? "Fleet placed automatically. Submit your placement."
        : "Fleet placed automatically. Start the battle."
    );
  };

  const startGame = () => {
    if (player) return;
    if (currentShipIndex < SHIPS.length) {
      setMessage("Place all ships before starting the game.");
      return;
    }
    if (!canStartLocal) {
      setMessage("Use multiplayer controls to create/join a room.");
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
    if (isMultiplayer) {
      if (!isInRoom || !isMyTurn || roomPhase !== "playing") return;
      socketRef.current?.emit("take_shot", {
        roomId,
        playerId,
        target: { row, col },
      });
      return;
    }
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
    if (isMultiplayer) return;
    if (!player || !computer) return;
    if (winner) return;
    if (currentTurn !== "computer") return;
    const timer = window.setTimeout(() => {
      handleComputerShot();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [player, computer, currentTurn, winner, isMultiplayer]);

  const handleReset = () => {
    setPlacement(createEmptyPlacement());
    setCurrentShipIndex(0);
    setOrientation("H");
    setPlayer(null);
    setComputer(null);
    setCurrentTurn("player");
    setWinner(null);
    setMessage("Place your fleet to start the game.");
    setEnemyFog(createEmptyFog());
    setSelfGrid(createEmptySelfGrid());
    setRoomPhase("idle");
    setActivePlayerId(null);
    setRoomPlayers([]);
    setRoomId(null);
    setPlayerId(null);
    setErrorMessage(null);
    socketRef.current?.disconnect();
    socketRef.current = null;
  };

  const handleConnect = () => {
    if (socketRef.current) return;
    const socket = io(SERVER_URL, { transports: ["websocket"] });
    socketRef.current = socket;
    setMessage("Connecting to server...");

    socket.on("connect", () => {
      setIsConnected(true);
      setMessage("Connected. Create or join a room.");
      // socket.emit("rooms_please", {});
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      setMessage("Disconnected from server.");
      setRoomPhase("idle");
      setActivePlayerId(null);
      setRoomPlayers([]);
      setRoomId(null);
      setPlayerId(null);
      setAvailableRooms([]);
    });

    socket.on(
      "room_created",
      ({ roomId: newRoomId, playerId: newPlayerId } = {}) => {
        if (!newRoomId || !newPlayerId) {
          setErrorMessage("ROOM_CREATE_FAILED");
          setMessage("Error: ROOM_CREATE_FAILED");
          return;
        }
        setRoomId(newRoomId);
        setPlayerId(newPlayerId);
        playerIdRef.current = newPlayerId;
        setRoomPhase("placing");
        setMessage(`Room created (${newRoomId}). Awaiting opponent.`);
      }
    );

    socket.on("room_joined", ({ roomId: joinedRoomId, playerId }) => {
      setRoomId(joinedRoomId);
      setPlayerId(playerId);
      playerIdRef.current = playerId;
      setMessage(`Joined room ${joinedRoomId}. Place your fleet.`);
    });

    socket.on("room_state", (state) => {
      const currentPlayerId = playerIdRef.current;
      setRoomPhase(state.phase);
      setActivePlayerId(state.activePlayerId);
      setRoomPlayers(state.players ?? []);
      if (state.phase === "playing") {
        setMessage(
          state.activePlayerId === currentPlayerId
            ? "Your turn. Fire on the enemy grid."
            : "Opponent turn. Waiting..."
        );
      }
    });

    socket.on("placement_accepted", ({ readyCount }) => {
      setMessage(`Placement accepted. Ready players: ${readyCount}/2.`);
    });

    socket.on("rooms_list", ({ rooms }) => {
      setAvailableRooms(Array.isArray(rooms) ? rooms : []);
    });

    socket.on(
      "shot_result",
      ({ result, isSunk, shipName, nextTurnPlayerId }) => {
        if (result === "hit") {
          setMessage(isSunk ? `Hit! You sank ${shipName}.` : "Hit!");
        } else if (result === "miss") {
          setMessage("Miss.");
        }
        setActivePlayerId(nextTurnPlayerId);
      }
    );

    socket.on("fog_update", ({ enemyGrid }) => {
      const next = enemyGrid ?? {};
      setEnemyFog({
        shots: Array.isArray(next.shots) ? next.shots : [],
        shipsSunk: Number.isFinite(next.shipsSunk) ? next.shipsSunk : 0,
      });
    });

    socket.on("self_update", ({ ownGrid }) => {
      const next = ownGrid ?? {};
      const rawHits = Array.isArray(next.hits) ? next.hits : [];
      const rawMisses = Array.isArray(next.misses) ? next.misses : [];
      const normalizedMisses = rawMisses.every((entry) => Array.isArray(entry))
        ? rawMisses
        : rawMisses.reduce((pairs, value, index) => {
            if (index % 2 === 0) {
              return pairs.concat([[value, rawMisses[index + 1]]]);
            }
            return pairs;
          }, []);
      setSelfGrid({
        hits: rawHits,
        misses: normalizedMisses,
        ships: Array.isArray(next.ships) ? next.ships : [],
      });
    });

    socket.on("game_over", ({ winnerId, reason }) => {
      const currentPlayerId = playerIdRef.current;
      const youWon = winnerId && winnerId === currentPlayerId;
      setWinner(youWon ? "player" : "computer");
      setMessage(
        reason === "opponent_left"
          ? "Opponent left the match."
          : youWon
          ? "You win! All enemy ships have been sunk."
          : "You lose. Your fleet was sunk."
      );
    });

    socket.on("error", ({ code }) => {
      setErrorMessage(code);
      setMessage(`Error: ${code}`);
    });
  };

  const handleCreateRoom = () => {
    if (!socketRef.current) return;
    socketRef.current.emit("create_room", { playerName });
  };

  const handleJoinRoom = (explicitRoomId) => {
    const nextRoomId = explicitRoomId;
    if (!socketRef.current || !nextRoomId) return;
    socketRef.current.emit("join_room", {
      roomId: nextRoomId.trim(),
      playerName,
    });
  };

  const handleSubmitPlacement = () => {
    if (!socketRef.current || !roomId || !playerId) return;
    if (!isReadyToSubmit) {
      setMessage("Place all ships before submitting.");
      return;
    }
    socketRef.current.emit("submit_placement", {
      roomId,
      playerId,
      placements: {
        ships: placement.ships.map(({ name, size, positions }) => ({
          name,
          size,
          positions,
        })),
      },
    });
  };

  const getCellStatus = (cell, hideShips) => {
    if (cell.isHit && cell.shipId !== null) return "hit";
    if (cell.isHit && cell.shipId === null) return "miss";
    if (!hideShips && cell.shipId !== null) return "ship";
    return "empty";
  };

  const getEnemyCellStatus = (row, col) => {
    const shot = enemyFog.shots.find(
      (entry) => entry.row === row && entry.col === col
    );
    if (!shot) return "empty";
    return shot.result === "hit" ? "hit" : "miss";
  };

  const getSelfCellStatus = (row, col, fallbackCell) => {
    if (!isMultiplayer) {
      return getCellStatus(fallbackCell, false);
    }
    const wasHit = selfGrid.hits.some((entry) => {
      if (!Array.isArray(entry) || entry.length < 2) return false;
      const [hitRow, hitCol] = entry;
      return hitRow === row && hitCol === col;
    });
    if (wasHit) return "hit";
    const wasMiss = selfGrid.misses.some((entry) => {
      if (!Array.isArray(entry) || entry.length < 2) return false;
      const [missRow, missCol] = entry;
      return missRow === row && missCol === col;
    });
    if (wasMiss) return "miss";
    return fallbackCell.shipId !== null ? "ship" : "empty";
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">Battleship Command</p>
          <h1>Battleship</h1>
          <p className="status">{message}</p>
          {errorMessage && <p className="status">Last error: {errorMessage}</p>}
        </div>
        {!isMultiplayer ? (
          <div className="controls">
            <button
              type="button"
              onClick={() => setIsMultiplayer((prev) => !prev)}
              disabled={!!player || isInRoom}
            >
              Mode: {isMultiplayer ? "Multiplayer" : "Local"}
            </button>
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
        ) : (
          <div className="controls">
            <button
              type="button"
              onClick={() => setIsMultiplayer((prev) => !prev)}
              disabled={!!player || isInRoom || isConnected}
            >
              Mode: {isMultiplayer ? "Multiplayer" : "Local"}
            </button>
            <button type="button" onClick={handleReset}>
              Reset Game
            </button>
          </div>
        )}
      </header>

      {isMultiplayer && multiplayerScreen === "connect" && (
        <ConnectScreen
          playerName={playerName}
          setPlayerName={setPlayerName}
          handleConnect={handleConnect}
        />
      )}

      {isMultiplayer && multiplayerScreen === "lobby" && (
        <LobbyScreen
          handleCreateRoom={handleCreateRoom}
          handleJoinRoom={handleJoinRoom}
          availableRooms={availableRooms}
        />
      )}

      {isMultiplayer && multiplayerScreen === "place" && (
        <PlaceScreen
          handleToggleOrientation={handleToggleOrientation}
          orientation={orientation}
          handleAutoPlace={handleAutoPlace}
          handleSubmitPlacement={handleSubmitPlacement}
          isReadyToSubmit={isReadyToSubmit}
          placement={placement}
          getCellKey={getCellKey}
          handleManualPlacement={handleManualPlacement}
        />
      )}

      {isMultiplayer && multiplayerScreen === "waiting" && (
        <WaitingScreen roomId={roomId} roomPlayers={roomPlayers} />
      )}

      {winner && (
        <div className="winner-banner">
          Winner: {winner === "player" ? "You" : "Opponent"}
        </div>
      )}

      {!isMultiplayer && (
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
                  <Stat
                    label="Ships placed"
                    value={computerStats.shipsPlaced}
                  />
                  <Stat label="Turns taken" value={computer.turns} />
                  <Stat label="Ships to place" value={0} />
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
                      className={`cell ${getSelfCellStatus(
                        rowIndex,
                        colIndex,
                        player ? player.board[rowIndex][colIndex] : cell
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
                <Stat
                  label="Ships remaining to place"
                  value={remainingToPlace}
                />
                <Stat
                  label="Orientation"
                  value={orientation === "H" ? "Horizontal" : "Vertical"}
                />
              </div>
            )}
          </section>
        </main>
      )}

      {isMultiplayer && multiplayerScreen === "play" && (
        <PlayScreen
          isMyTurn={isMyTurn}
          createEmptyBoard={createEmptyBoard}
          getCellKey={getCellKey}
          getEnemyCellStatus={getEnemyCellStatus}
          handlePlayerShot={handlePlayerShot}
          isInRoom={isInRoom}
          winner={winner}
          enemyFog={enemyFog}
          placement={placement}
          getSelfCellStatus={getSelfCellStatus}
          selfGrid={selfGrid}
        />
      )}

      {player && computer && currentTurn === "computer" && !winner && (
        <div className="computer-turn">
          <span className="status">Computer is firing...</span>
        </div>
      )}
    </div>
  );
}

export default App;
