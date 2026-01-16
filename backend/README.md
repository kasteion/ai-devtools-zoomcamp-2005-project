# Battleship Backend

## Server overview

- Transport: Socket.IO over HTTP.
- Default URL: `http://localhost:5175`.
- Health check: `GET /health` returns `{ status: "ok" }`.

## Start the server

From the project root:

```bash
cd backend
npm install
npm run dev
```

The server logs: `Socket.IO server running on http://localhost:5175`.

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
