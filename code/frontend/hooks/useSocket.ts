'use client';

import { useEffect, useRef } from 'react';
import { useSocketContext } from '@/lib/socket';

// Returns the raw socket instance and connection state
export function useSocket() {
  return useSocketContext();
}

// Subscribe to a socket event, auto-cleanup on unmount
export function useSocketEvent<T = unknown>(
  event: string,
  handler: (data: T) => void
) {
  const { socket } = useSocketContext();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket) return;

    const listener = (data: T) => handlerRef.current(data);
    socket.on(event, listener);

    return () => {
      socket.off(event, listener);
    };
  }, [socket, event]);
}

// Join a Socket.io room on mount, leave on unmount
export function useJoinRoom(room: string | null | undefined) {
  const { socket } = useSocketContext();

  useEffect(() => {
    if (!socket || !room) return;

    socket.emit('join-room', room);

    return () => {
      socket.emit('leave-room', room);
    };
  }, [socket, room]);
}
