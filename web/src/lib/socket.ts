'use client';
import { io, Socket } from 'socket.io-client';
import { API_URL } from './api';

let socket: Socket | null = null;

/** Lazily connect (and reuse) the Socket.io client, authenticated with a Clerk token. */
export function getSocket(token: string): Socket {
  if (socket && socket.connected && (socket.auth as any)?.token === token) return socket;
  if (socket) socket.disconnect();
  socket = io(API_URL, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
