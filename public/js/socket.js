import { io } from 'socket.io-client';
import { getToken } from './api.js';

let socket = null;

export function connectSocket() {
  if (socket) return socket;
  socket = io({ transports: ['websocket', 'polling'] });
  socket.on('connect', () => socket.emit('identify', getToken()));
  return socket;
}

export function getSocket() { return socket || connectSocket(); }

// Kleiner Helfer, um in React-Komponenten bequem auf Events zu hören.
export function onEvent(event, handler) {
  const s = getSocket();
  s.on(event, handler);
  return () => s.off(event, handler);
}
