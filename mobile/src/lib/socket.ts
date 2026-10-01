import { io, Socket } from 'socket.io-client';
import { config } from './config';

/**
 * Lazily-initialised Socket.io client shared across screens (notifications,
 * live classes, leaderboards, challenges). The auth token is supplied by the
 * caller at connect time so the server can authorise the handshake.
 */
let socket: Socket | null = null;

export function connectSocket(token: string | null): Socket {
  if (socket?.connected) return socket;
  socket = io(config.socketUrl, {
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 1500,
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/** Namespaced server events the app listens for. */
export const socketEvents = {
  notification: 'notification:new',
  leaderboardUpdate: 'leaderboard:update',
  challengeUpdate: 'challenge:update',
  classChat: 'class:chat',
  classReaction: 'class:reaction',
  liveRepCounter: 'class:reps',
} as const;
