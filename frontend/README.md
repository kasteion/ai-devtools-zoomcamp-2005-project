# Battleship Frontend

React + Vite frontend for the Battleship game. It includes the authentication flow, multiplayer connect/lobby screens, and gameplay UI. The frontend talks to the backend REST and Socket.IO APIs (default backend URL: `http://localhost:5175`).

## Prerequisites

- Node.js 20+
- Backend running on `http://localhost:5175` (see [`backend/README.md`](../backend/README.md))

## Install dependencies

```sh
cd frontend
npm install
```

## Run the app

```sh
npm run dev
```

Vite will print the local URL (typically `http://localhost:5173`).

## Run tests

Run the frontend unit tests:

```sh
npm run test
```

Watch mode during development:

```sh
npm run test:watch
```
