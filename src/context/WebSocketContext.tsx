'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import WebSocketManager from '@/lib/websocket';

interface ConnectedUser {
  role: string;
  timestamp: Date;
}

interface WebSocketContextType {
  isConnected: boolean;
  connectedUsers: ConnectedUser[];
  wsManager: WebSocketManager;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [wsManager] = useState(() => WebSocketManager.getInstance());

  useEffect(() => {
    if (status === 'authenticated' && user) {
      // Connect to WebSocket
      const socket = wsManager.connect(user.id, user.role);

      // Listen for connection status
      socket?.on('connect', () => setIsConnected(true));
      socket?.on('disconnect', () => setIsConnected(false));

      // Listen for connected users updates
      wsManager.onConnectedUsers((users) => {
        setConnectedUsers(users);
      });

      // Cleanup function to remove event listeners when component unmounts
      return () => {
        socket?.off('connect');
        socket?.off('disconnect');
        // Don't disconnect the socket here - let it persist across route changes
      };
    }
  }, [user, status, wsManager]);

  // Only disconnect when the user logs out completely
  useEffect(() => {
    if (status === 'unauthenticated') {
      wsManager.disconnect();
      setIsConnected(false);
      setConnectedUsers([]);
    }
  }, [status, wsManager]);

  return (
    <WebSocketContext.Provider value={{
      isConnected,
      connectedUsers,
      wsManager
    }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
