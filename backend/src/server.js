const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const path = require("path");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const PORT = process.env.PORT || 5175;
const MONGO_URI = process.env.MONGO_URI;
const MONGO_DB_NAME = process.env.MONGO_DB_NAME;
const JWT_SECRET = process.env.JWT_SECRET;

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}

const connectToMongo = async () => {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }
  if (!MONGO_DB_NAME) {
    throw new Error("MONGO_DB_NAME is required");
  }
  await mongoose.connect(MONGO_URI, { dbName: MONGO_DB_NAME });
  console.log("MongoDB connected");
};

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

const userStatsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
    gamesPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    hits: { type: Number, default: 0 },
    misses: { type: Number, default: 0 },
    shotsFired: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const UserStats = mongoose.model("UserStats", userStatsSchema);

const createToken = (userId) =>
  jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "7d" });

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }
};

const ensureSelf = (req, res, next) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "INVALID_USER_ID" });
  }
  if (userId !== req.userId) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }
  return next();
};

const normalizeStats = (payload = {}) => {
  const fields = [
    "gamesPlayed",
    "wins",
    "losses",
    "hits",
    "misses",
    "shotsFired",
  ];
  const stats = {};
  fields.forEach((field) => {
    if (payload[field] !== undefined) {
      const value = Number(payload[field]);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(`INVALID_${field.toUpperCase()}`);
      }
      stats[field] = value;
    }
  });
  return stats;
};

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body ?? {};
    if (!username || !email || !password) {
      return res.status(400).json({ error: "MISSING_FIELDS" });
    }
    const existing = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (existing) {
      return res.status(409).json({ error: "USER_EXISTS" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      passwordHash,
    });
    const token = createToken(user.id);
    return res.status(201).json({
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { identifier, password } = req.body ?? {};
    if (!identifier || !password) {
      return res.status(400).json({ error: "MISSING_FIELDS" });
    }
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });
    if (!user) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }
    const token = createToken(user.id);
    return res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

app.get("/api/users/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("username email");
    if (!user) {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }
    return res.json({
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

app.put(
  "/api/users/:userId/stats",
  authMiddleware,
  ensureSelf,
  async (req, res) => {
    try {
      const existing = await UserStats.findOne({ userId: req.params.userId });
      if (existing) {
        return res.status(409).json({ error: "STATS_ALREADY_EXISTS" });
      }
      const stats = normalizeStats(req.body);
      const created = await UserStats.create({
        userId: req.params.userId,
        ...stats,
      });
      return res.status(201).json({
        stats: {
          userId: created.userId,
          gamesPlayed: created.gamesPlayed,
          wins: created.wins,
          losses: created.losses,
          hits: created.hits,
          misses: created.misses,
          shotsFired: created.shotsFired,
        },
      });
    } catch (err) {
      if (err.message?.startsWith("INVALID_")) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: "SERVER_ERROR" });
    }
  },
);

app.get(
  "/api/users/:userId/stats",
  authMiddleware,
  ensureSelf,
  async (req, res) => {
    try {
      const stats = await UserStats.findOne({ userId: req.params.userId });
      if (!stats) {
        return res.status(404).json({ error: "STATS_NOT_FOUND" });
      }
      return res.json({
        stats: {
          userId: stats.userId,
          gamesPlayed: stats.gamesPlayed,
          wins: stats.wins,
          losses: stats.losses,
          hits: stats.hits,
          misses: stats.misses,
          shotsFired: stats.shotsFired,
        },
      });
    } catch (err) {
      return res.status(500).json({ error: "SERVER_ERROR" });
    }
  },
);

app.patch(
  "/api/users/:userId/stats",
  authMiddleware,
  ensureSelf,
  async (req, res) => {
    try {
      const statsUpdate = normalizeStats(req.body);
      let stats = await UserStats.findOneAndUpdate(
        { userId: req.params.userId },
        { $set: statsUpdate },
        { new: true },
      );
      if (!stats) {
        stats = await UserStats.create({
          userId: req.params.userId,
          ...statsUpdate,
        });
      }
      return res.json({
        stats: {
          userId: stats.userId,
          gamesPlayed: stats.gamesPlayed,
          wins: stats.wins,
          losses: stats.losses,
          hits: stats.hits,
          misses: stats.misses,
          shotsFired: stats.shotsFired,
        },
      });
    } catch (err) {
      if (err.message?.startsWith("INVALID_")) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: "SERVER_ERROR" });
    }
  },
);

app.get("/api/leaderboard", authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const leaderboard = await UserStats.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $sort: { wins: -1, gamesPlayed: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          userId: "$userId",
          username: "$user.username",
          wins: 1,
          losses: 1,
          gamesPlayed: 1,
          hits: 1,
          misses: 1,
          shotsFired: 1,
        },
      },
    ]);

    return res.json({ leaderboard });
  } catch (err) {
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const BOARD_SIZE = 10;

const createEmptyBoard = () =>
  Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ({ shipId: null, isHit: false })),
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
          ship.positions.filter(([r, c]) => defender.board[r][c].isHit),
        ),
        misses: defender.board
          .flatMap((rowCells, r) =>
            rowCells
              .map((cell, c) => ({ cell, r, c }))
              .filter((entry) => entry.cell.isHit && entry.cell.shipId === null)
              .map((entry) => [entry.r, entry.c]),
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

app.get("/openapi.yaml", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "..", "openapi.yaml"));
});

if (require.main === module) {
  connectToMongo()
    .then(() => {
      server.listen(PORT, () => {
        console.log(`Socket.IO server running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error("MongoDB connection error:", err);
      process.exit(1);
    });
}

module.exports = { app, server };
