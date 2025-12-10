'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import WebSocketManager, { type TestMessage } from '@/lib/websocket';

const wsManager = new WebSocketManager();

interface WebSocketTestProps {
  auctionId: string;
  userRole: string;
}

export default function WebSocketTest({ auctionId, userRole }: WebSocketTestProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedRoles, setConnectedRoles] = useState<string[]>([]);

  useEffect(() => {
    const socket = wsManager?.connect(undefined, userRole);
    
    const handleConnect = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
    };

    const handleTestMessage = (message: TestMessage) => {
      // Update connected roles
      setConnectedRoles(message.connectedRoles || []);
      
      // Show toast for messages from other roles
      if (message.role !== userRole) {
        toast.info(`Socket Test from ${message.role}`, {
          description: `Connected roles: ${message.connectedRoles.join(', ')}`,
        });
      }
    };

    const handleConnectedUsers = (users: { role: string, timestamp: Date }[]) => {
      setConnectedRoles(users.map(u => u.role));
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    wsManager.onTestMessage(handleTestMessage);
    wsManager.onConnectedUsers(handleConnectedUsers);

    // Set initial connection state
    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      wsManager.offTestMessage(handleTestMessage);
      wsManager.offConnectedUsers(handleConnectedUsers);
    };
  }, [userRole]);

  const testConnection = () => {
    if (!isConnected) {
      toast.error('WebSocket is not connected!');
      return;
    }

    wsManager.sendTestMessage(auctionId, 'Connection test successful', userRole);
    toast.success('WebSocket test sent!', {
      description: `Connected roles: ${connectedRoles.join(', ')}`,
    });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {connectedRoles.map((role, index) => (
          <Badge 
            key={index}
            variant={role === userRole ? "default" : "secondary"}
            className="text-xs"
          >
            {role}
          </Badge>
        ))}
      </div>
      <Button 
        onClick={testConnection}
        variant={isConnected ? "default" : "destructive"}
        size="sm"
      >
        {isConnected ? '🟢 Test Socket' : '🔴 Socket Offline'}
      </Button>
    </div>
  );
} 