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
  const [connectionKey, setConnectionKey] = useState<string | null>(null);
  const [reconnectTimeout, setReconnectTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && user) {
      const userKey = `${user.id}-${user.role}`;

      // Only reconnect if user changed
      if (connectionKey !== userKey) {
        console.log('🔄 WebSocket: Establishing connection for user:', userKey);

        // Connect to WebSocket
        const socket = wsManager.connect(user.id, user.role);

        // Listen for connection status
        const handleConnect = () => {
          console.log('✅ WebSocket: Connected');
          setIsConnected(true);
        };

        const handleDisconnect = (reason: string) => {
          console.log('❌ WebSocket: Disconnected -', reason);
          setIsConnected(false);

          // Clear any existing reconnect timeout
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            setReconnectTimeout(null);
          }

          // Auto-reconnect logic for unexpected disconnects
          if (reason === 'io server disconnect' || reason === 'io client disconnect' || reason === 'transport close') {
            console.log('🔄 WebSocket: Scheduling reconnection in 2 seconds...');
            const timeout = setTimeout(() => {
              if (status === 'authenticated' && user && connectionKey === `${user.id}-${user.role}`) {
                console.log('🔄 WebSocket: Attempting reconnection...');
                wsManager.connect(user.id, user.role);
              }
            }, 2000);
            setReconnectTimeout(timeout);
          }
        };

        socket?.on('connect', handleConnect);
        socket?.on('disconnect', handleDisconnect);

        // Listen for connected users updates
        wsManager.onConnectedUsers((users) => {
          setConnectedUsers(users);
        });

        setConnectionKey(userKey);

        // Cleanup function to remove event listeners when component unmounts
        return () => {
          socket?.off('connect', handleConnect);
          socket?.off('disconnect', handleDisconnect);
          // Clear any pending reconnect timeout
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            setReconnectTimeout(null);
          }
          // Don't disconnect the socket here - let it persist across route changes
        };
      }
    } else if (status === 'unauthenticated') {
      setConnectionKey(null);
    }
  }, [user, status, wsManager, connectionKey]);

  // Only disconnect when the user logs out completely
  useEffect(() => {
    if (status === 'unauthenticated') {
      // Clear any pending reconnect timeout
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        setReconnectTimeout(null);
      }
      wsManager.disconnect();
      setIsConnected(false);
      setConnectedUsers([]);
      setConnectionKey(null);
    }
  }, [status, wsManager, reconnectTimeout]);

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
