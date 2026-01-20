import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_API_BASE_URL;
const SOCKET_OPTIONS = { transports: ["websocket"] };

export const createSocket = () => io(SERVER_URL, SOCKET_OPTIONS);

export const attachSocketHandlers = ({ socket, handlers }) => {
  if (!socket) return () => {};

  const {
    onConnect,
    onDisconnect,
    onRoomCreated,
    onRoomJoined,
    onRoomState,
    onPlacementAccepted,
    onShotResult,
    onFogUpdate,
    onSelfUpdate,
    onGameOver,
    onError,
    onRoomsList,
  } = handlers ?? {};

  const listeners = {
    connect: () => onConnect?.(socket),
    disconnect: () => onDisconnect?.(),
    room_created: (payload) => {
      const { roomId, playerId } = payload ?? {};
      onRoomCreated?.({ roomId, playerId });
    },
    room_joined: (payload) => {
      const { roomId, playerId } = payload ?? {};
      onRoomJoined?.({ roomId, playerId });
    },
    room_state: (state) => onRoomState?.(state),
    placement_accepted: (payload) => onPlacementAccepted?.(payload ?? {}),
    shot_result: (payload) => onShotResult?.(payload ?? {}),
    fog_update: (payload) => onFogUpdate?.(payload ?? {}),
    self_update: (payload) => onSelfUpdate?.(payload ?? {}),
    game_over: (payload) => onGameOver?.(payload ?? {}),
    error: (payload) => onError?.(payload ?? {}),
    rooms_list: (payload) => onRoomsList?.(payload ?? {}),
  };

  Object.entries(listeners).forEach(([event, handler]) => {
    socket.on(event, handler);
  });

  return () => detachSocketHandlers({ socket, listeners });
};

export const detachSocketHandlers = ({ socket, listeners }) => {
  if (!socket || !listeners) return;
  Object.entries(listeners).forEach(([event, handler]) => {
    socket.off(event, handler);
  });
};
