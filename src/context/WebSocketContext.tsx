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
  connectionInfo: any;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const [wsManager] = useState(() => WebSocketManager.getInstance());
  const [isConnected, setIsConnected] = useState(() => wsManager.isConnected);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [connectionInfo, setConnectionInfo] = useState<any>(() => wsManager.getConnectionInfo());
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
        setConnectionKey(userKey);
      }

      // Always set up callbacks when user is authenticated
      // (moved outside the user change check so it runs every time)
      const cleanupConnectionStatus = wsManager.onConnectionStatus((connected) => {
        console.log('🔄 WebSocket: Connection status changed:', connected, 'User:', user?.id, 'Role:', user?.role);
        setIsConnected(connected);
        setConnectionInfo(wsManager.getConnectionInfo());
      });

      // Listen for auction updates (both WebSocket and polling)
      const cleanupAuctionUpdates = wsManager.onAuctionUpdate((update) => {
        // This can be used by components that need to listen to auction updates globally
        console.log('📡 Auction update received:', update.type, update.auctionId);
      });

      // Listen for connected users updates
      const cleanupConnectedUsers = wsManager.onConnectedUsers((users) => {
        setConnectedUsers(users);
      });

      // Cleanup function to remove event listeners when component unmounts or user changes
      return () => {
        cleanupConnectionStatus();
        cleanupAuctionUpdates();
        cleanupConnectedUsers();
        // Clear any pending reconnect timeout
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          setReconnectTimeout(null);
        }
        // Don't disconnect the socket here - let it persist across route changes
      };
    } else if (status === 'unauthenticated') {
      setConnectionKey(null);
      setIsConnected(false);
      setConnectedUsers([]);
      setConnectionInfo(null);
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
      setConnectionInfo(null);
    }
  }, [status, wsManager, reconnectTimeout]);

  return (
    <WebSocketContext.Provider value={{
      isConnected,
      connectedUsers,
      wsManager,
      connectionInfo
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
