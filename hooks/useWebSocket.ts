'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

let socketInstance: Socket | null = null;

/**
 * Hook to manage WebSocket connection for real-time notifications
 * Usage: const { socket, isConnected } = useWebSocket();
 */
export function useWebSocket() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const isConnectedRef = useRef(false);

  useEffect(() => {
    if (!user?.token) return;

    // Connect to WebSocket server
    if (!socketInstance) {
      socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
        auth: {
          token: user.token
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ['websocket', 'polling']
      });

      // Connection events
      socketInstance.on('connect', () => {
        isConnectedRef.current = true;
        console.log('[WebSocket] Connected to server');
      });

      socketInstance.on('disconnect', () => {
        isConnectedRef.current = false;
        console.log('[WebSocket] Disconnected from server');
      });

      socketInstance.on('connect_error', (error) => {
        console.error('[WebSocket] Connection error:', error);
      });

      socketRef.current = socketInstance;
    }

    return () => {
      // Don't disconnect on unmount - keep connection alive
      // Only disconnect on complete logout
    };
  }, [user?.token]);

  useEffect(() => {
    return () => {
      // Cleanup on component unmount
      if (socketRef.current) {
        socketRef.current.off('connect');
        socketRef.current.off('disconnect');
        socketRef.current.off('connect_error');
      }
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected: isConnectedRef.current
  };
}

/**
 * Subscribe to real-time notifications
 * Usage: useNotificationSubscription((notification) => {
 *   // Handle notification
 * });
 */
export function useNotificationSubscription(callback: (notification: any) => void) {
  const { socket } = useWebSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on('notification', callback);

    return () => {
      socket.off('notification', callback);
    };
  }, [socket, callback]);
}

/**
 * Send a notification via WebSocket
 */
export function useSendNotification() {
  const { socket } = useWebSocket();

  return (notificationData: any) => {
    if (socket?.connected) {
      socket.emit('send_notification', notificationData);
    }
  };
}

/**
 * Subscribe to user status changes
 */
export function useUserStatusSubscription(callback: (data: any) => void) {
  const { socket } = useWebSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on('user_online', callback);
    socket.on('user_offline', callback);
    socket.on('user_status_changed', callback);

    return () => {
      socket.off('user_online', callback);
      socket.off('user_offline', callback);
      socket.off('user_status_changed', callback);
    };
  }, [socket, callback]);
}

/**
 * Disconnect WebSocket
 */
export function disconnectWebSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

export default useWebSocket;
