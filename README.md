# Battleship Command

Multiplayer Battleship web app with authentication, player stats, and real-time gameplay. The project includes a React + Vite frontend and a Node.js + Express + Socket.IO backend backed by MongoDB.

## Problem statement

Provide a complete Battleship experience that supports secure sign-in/sign-up, tracks player performance, and enables real-time multiplayer matches with room creation/joining.

## System functionality

- **Authentication**: register and log in users.
- **Multiplayer**: create/join rooms, place ships, and play turn-based matches over Socket.IO.
- **Stats & leaderboard**: persist user stats and display leaderboard rankings.
- **Local gameplay**: allow a solo game against a computer opponent.

## Expected behavior

1. Users can create an account or sign in.
2. Authenticated users can connect to the multiplayer lobby, create/join a room, and play Battleship.
3. The system records results and updates stats/leaderboard.
4. The UI provides the full flow from auth to gameplay and results.

## Project structure

- [`frontend/`](frontend/README.md): React + Vite client app.
- [`backend/`](backend/README.md): Node.js + Express + Socket.IO API/server.

# AI system development

Used VS Code with the Kilo Code using OpenAI: GPT-5.2-Codex. For a detailed history of the ai workflow check [here](ai-workflow-history)
