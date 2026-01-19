# Battleship Backend

Node.js + Express + Socket.IO backend for the Battleship game. It provides REST endpoints for authentication and stats, plus Socket.IO events for multiplayer gameplay. Default base URL: `http://localhost:5175`.

## Prerequisites

- Node.js 20+
- MongoDB connection string and database name (see Environment variables below)

## Install dependencies

```bash
cd backend
npm install
```

## Environment variables

Create a `.env` file in `backend/` or set these variables in your shell:

```bash
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=battleship
JWT_SECRET=change_me
PORT=5175
```

## Run the server

```bash
cd backend
npm run dev
```

The server logs: `Socket.IO server running on http://localhost:5175`.

## Run tests

```bash
cd backend
npm run test
```

## Connect to the server

Use a Socket.IO client to connect to the backend URL.

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:5175", {
  transports: ["websocket"],
});
```

## Multiplayer flow

### 1) Create or join a room

- **Create room**: emits `create_room` with `{ playerName }`.
- **Join room**: emits `join_room` with `{ roomId, playerName }`.

Server responses:

- `room_created`: `{ roomId, playerId }`
- `room_joined`: `{ roomId, playerId }`
- `room_state`: room status snapshot

### 2) Place ships

Each player submits ship placements.

Emit:
`submit_placement` with `{ roomId, playerId, placements }`.

`placements` format:

```json
{
  "ships": [
    {
      "name": "Carrier",
      "size": 5,
      "positions": [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
        [0, 4]
      ]
    }
  ]
}
```

Server responses:

- `placement_accepted`: `{ roomId, playerId, readyCount }`
- `room_state`: when both players are ready, phase switches to `playing` and `activePlayerId` is set.

### 3) Play the game

Only the active player can shoot.

Emit:
`take_shot` with `{ roomId, playerId, target: { row, col } }`.

Server broadcasts:

- `shot_result`: `{ roomId, shooterId, target, result, isSunk, shipName, nextTurnPlayerId }`

Server direct messages:

- `fog_update`: to the shooter with their shot history and sunk count.
- `self_update`: to the defender with hits, misses, and ship status.

### 4) Game over

When all ships are sunk or a player disconnects:

- `game_over`: `{ roomId, winnerId, reason }`
  - `reason` can be `all_ships_sunk` or `opponent_left`.

## Error events

Server may emit `error` with a code:

- `ROOM_NOT_FOUND`
- `ROOM_FULL`
- `NOT_YOUR_TURN`
- `REPEAT_SHOT`

## Room state payload

`room_state` includes:

```json
{
  "roomId": "room_xxxxxx",
  "phase": "placing | playing | finished",
  "players": [
    { "playerId": "player_xxxxxx", "name": "Player 1", "ready": true }
  ],
  "activePlayerId": "player_xxxxxx",
  "turnCount": 3
}
```
