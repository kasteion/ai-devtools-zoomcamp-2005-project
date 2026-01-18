export const BOARD_SIZE = 10;
export const SHIPS = [
  { name: "Carrier", size: 5 },
  { name: "Battleship", size: 4 },
  { name: "Cruiser", size: 3 },
  { name: "Submarine", size: 3 },
  { name: "Destroyer", size: 2 },
];

export const createEmptyBoard = () =>
  Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ({
      shipId: null,
      isHit: false,
    }))
  );

export const coordsInBounds = (row, col) =>
  row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;

export const canPlaceShip = (board, row, col, size, orientation) => {
  for (let i = 0; i < size; i += 1) {
    const r = orientation === "H" ? row : row + i;
    const c = orientation === "H" ? col + i : col;
    if (!coordsInBounds(r, c)) return false;
    if (board[r][c].shipId !== null) return false;
  }
  return true;
};

export const placeShip = (board, shipId, size, row, col, orientation) => {
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

export const randomInt = (max) => Math.floor(Math.random() * max);

export const randomlyPlaceShips = () => {
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

export const countShipsSunk = (ships) =>
  ships.filter((ship) => ship.hits >= ship.size).length;

export const countShipsHit = (ships) =>
  ships.filter((ship) => ship.hits > 0).length;

export const calculateStats = (state) => {
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

export const createPlayerState = (board, ships) => ({
  board,
  ships,
  shots: [],
  turns: 0,
});

export const computeShotResult = (board, row, col, ships) => {
  const cell = board[row][col];
  if (cell.isHit) return { result: "repeat", shipId: cell.shipId };
  if (cell.shipId === null) return { result: "miss", shipId: null };
  const ship = ships[cell.shipId];
  const isSunk = ship.hits + 1 >= ship.size;
  return { result: "hit", shipId: cell.shipId, isSunk };
};

export const applyShot = (state, row, col) => {
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

export const createEmptyPlacement = () => ({
  board: createEmptyBoard(),
  ships: SHIPS.map((ship) => ({ ...ship, positions: [], hits: 0 })),
});
