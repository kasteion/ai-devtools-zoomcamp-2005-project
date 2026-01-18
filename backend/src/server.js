const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 5175;

const app = express();
app.use(cors({ origin: "*" }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const BOARD_SIZE = 10;

const createEmptyBoard = () =>
  Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ({ shipId: null, isHit: false }))
  );

const createRoom = (roomId) => ({
  roomId,
  phase: "placing",
  players: [],
  activePlayerId: null,
  turnCount: 0,
  shots: new Map(),
});

const buildBoardFromPlacements = (placements) => {
  const board = createEmptyBoard();
  const ships = placements.ships.map((ship, index) => ({
    ...ship,
    hits: 0,
    shipId: index,
  }));

  ships.forEach((ship, shipId) => {
    ship.positions.forEach(([row, col]) => {
      if (board[row] && board[row][col]) {
        board[row][col].shipId = shipId;
      }
    });
  });

  return { board, ships };
};

const countShipsSunk = (ships) =>
  ships.filter((ship) => ship.hits >= ship.size).length;

const computeShot = (board, ships, row, col) => {
  const cell = board[row][col];
  if (cell.isHit) return { result: "repeat", isSunk: false, shipName: null };
  cell.isHit = true;
  if (cell.shipId === null) {
    return { result: "miss", isSunk: false, shipName: null };
  }
  const ship = ships[cell.shipId];
  ship.hits += 1;
  const isSunk = ship.hits >= ship.size;
  return { result: "hit", isSunk, shipName: ship.name };
};

const rooms = new Map();

const sendRoomState = (room) => {
  io.to(room.roomId).emit("room_state", {
    roomId: room.roomId,
    phase: room.phase,
    players: room.players.map((player) => ({
      playerId: player.playerId,
      name: player.name,
      ready: player.ready,
    })),
    activePlayerId: room.activePlayerId,
    turnCount: room.turnCount,
  });
};

io.on("connection", (socket) => {
  const emitRooms = () => {
    const availableRooms = Array.from(rooms, ([, r]) => ({
      roomId: r.roomId,
      phase: r.phase,
      players: r.players.map((p) => ({
        playerId: p.playerId,
        name: p.name,
        ready: p.ready,
      })),
    })).filter((r) => r.players.length < 2);
    socket.emit("rooms_list", { rooms: availableRooms });
  };

  emitRooms();

  socket.on("create_room", ({ playerName }) => {
    const roomId = `room_${Math.random().toString(36).slice(2, 8)}`;
    const room = createRoom(roomId);
    const playerId = `player_${Math.random().toString(36).slice(2, 8)}`;
    room.players.push({
      socketId: socket.id,
      playerId,
      name: playerName ?? "Player 1",
      ready: false,
      board: null,
      ships: null,
    });
    rooms.set(roomId, room);
    socket.join(roomId);
    socket.emit("room_created", { roomId, playerId });
    sendRoomState(room);
    emitRooms();
  });

  socket.on("join_room", ({ roomId, playerName }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit("error", { code: "ROOM_NOT_FOUND" });
      return;
    }
    if (room.players.length >= 2) {
      socket.emit("error", { code: "ROOM_FULL" });
      return;
    }
    const playerId = `player_${Math.random().toString(36).slice(2, 8)}`;
    room.players.push({
      socketId: socket.id,
      playerId,
      name: playerName ?? "Player 2",
      ready: false,
      board: null,
      ships: null,
    });
    socket.join(roomId);
    socket.emit("room_joined", { roomId, playerId });
    sendRoomState(room);
    emitRooms();
  });

  socket.on("submit_placement", ({ roomId, playerId, placements }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.find((p) => p.playerId === playerId);
    if (!player) return;
    const { board, ships } = buildBoardFromPlacements(placements);
    player.board = board;
    player.ships = ships;
    player.ready = true;
    socket.emit("placement_accepted", {
      roomId,
      playerId,
      readyCount: room.players.filter((p) => p.ready).length,
    });
    if (!room.activePlayerId) room.activePlayerId = player.playerId;
    sendRoomState(room);
    if (room.players.length === 2 && room.players.every((p) => p.ready)) {
      room.phase = "playing";
      room.activePlayerId = room.players[0].playerId;
      sendRoomState(room);
    }
  });

  socket.on("take_shot", ({ roomId, playerId, target }) => {
    const room = rooms.get(roomId);
    if (!room || room.phase !== "playing") return;
    if (room.activePlayerId !== playerId) {
      socket.emit("error", { code: "NOT_YOUR_TURN" });
      return;
    }
    const shooter = room.players.find((p) => p.playerId === playerId);
    const defender = room.players.find((p) => p.playerId !== playerId);
    if (!defender?.board || !defender.ships) return;

    const { row, col } = target;
    const result = computeShot(defender.board, defender.ships, row, col);
    if (result.result === "repeat") {
      socket.emit("error", { code: "REPEAT_SHOT" });
      return;
    }

    const shotEntry = { row, col, result: result.result };
    const shooterShots = room.shots.get(shooter.playerId) ?? [];
    shooterShots.push(shotEntry);
    room.shots.set(shooter.playerId, shooterShots);

    io.to(room.roomId).emit("shot_result", {
      roomId,
      shooterId: shooter.playerId,
      target: { row, col },
      result: result.result,
      isSunk: result.isSunk,
      shipName: result.shipName,
      nextTurnPlayerId: defender.playerId,
    });

    io.to(shooter.socketId).emit("fog_update", {
      roomId,
      viewerId: shooter.playerId,
      enemyGrid: {
        shots: shooterShots,
        shipsSunk: countShipsSunk(defender.ships),
      },
    });

    io.to(defender.socketId).emit("self_update", {
      roomId,
      playerId: defender.playerId,
      ownGrid: {
        hits: defender.ships.flatMap((ship) =>
          ship.positions.filter(([r, c]) => defender.board[r][c].isHit)
        ),
        misses: defender.board
          .flatMap((rowCells, r) =>
            rowCells
              .map((cell, c) => ({ cell, r, c }))
              .filter((entry) => entry.cell.isHit && entry.cell.shipId === null)
              .map((entry) => [entry.r, entry.c])
          )
          .flat(),
        ships: defender.ships.map((ship) => ({
          name: ship.name,
          size: ship.size,
          positions: ship.positions,
          hits: ship.hits,
        })),
      },
    });

    if (countShipsSunk(defender.ships) === defender.ships.length) {
      room.phase = "finished";
      io.to(room.roomId).emit("game_over", {
        roomId: room.roomId,
        winnerId: shooter.playerId,
        reason: "all_ships_sunk",
      });
      return;
    }

    room.activePlayerId = defender.playerId;
    room.turnCount += 1;
    sendRoomState(room);
  });

  socket.on("disconnect", () => {
    rooms.forEach((room) => {
      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;
      io.to(room.roomId).emit("game_over", {
        roomId: room.roomId,
        winnerId: room.players.find((p) => p.socketId !== socket.id)?.playerId,
        reason: "opponent_left",
      });
      rooms.delete(room.roomId);
    });
    emitRooms();
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

server.listen(PORT, () => {
  console.log(`Socket.IO server running on http://localhost:${PORT}`);
});
