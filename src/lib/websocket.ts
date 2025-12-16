import { io, Socket } from 'socket.io-client';

export interface AuctionEvent {
  type: 'bid_placed' | 'player_changed' | 'auction_started' | 'auction_ended' | 'timer_update'| 'auction_paused' | 'auction_resumed' | 'timer_sync' | 'player_sold' | 'auction_updated';
  auctionId: string;
  data: any;
}

export interface TestMessage {
  message: string;
  timestamp: string;
  connectedRoles: string[];
  role: string;
}

export interface ConnectedUser {
  role: string;
  timestamp: Date;
}

export interface AuctionUpdate {
  auctionId: string;
  type: 'bid_placed' | 'player_changed' | 'auction_started' | 'auction_ended' | 'auction_paused' | 'auction_resumed';
  data: any;
  timestamp: number;
}

class WebSocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat: number = Date.now();
  private testMessageCallbacks: ((message: TestMessage) => void)[] = [];
  private connectedUsersCallbacks: ((users: ConnectedUser[]) => void)[] = [];
  private connectionStatusCallbacks: ((isConnected: boolean) => void)[] = [];
  private auctionUpdateCallbacks: ((update: AuctionUpdate) => void)[] = [];
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastPollingTimestamp: number = 0;
  private activeAuctionIds: Set<string> = new Set();
  private static instance: WebSocketManager | null = null;
  private currentUserId: string | null = null;
  private currentRole: string | null = null;
  private currentUrl: string | null = null;
  private isManuallyDisconnected = false;
  private usePollingFallback = false;

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  connect(userId?: string, role?: string) {
    // If manually disconnected, don't auto-reconnect
    if (this.isManuallyDisconnected) {
      console.log('🔄 WebSocket: Manually disconnected, skipping connection');
      return null;
    }

    // If already connected with the same user, return existing socket
    if (this.socket?.connected && this.currentUserId === userId && this.currentRole === role) {
      console.log('🔄 WebSocket: Reusing existing connection for same user');
      return this.socket;
    }

    // If socket exists but user changed, disconnect first
    if (this.socket?.connected && (this.currentUserId !== userId || this.currentRole !== role)) {
      console.log('🔄 WebSocket: User changed, disconnecting old connection');
      this.socket.disconnect();
      this.socket = null;
    }

    // If already connected with same user, return existing socket
    if (this.socket?.connected) {
      console.log('🔄 WebSocket: Reusing existing connection');
      return this.socket;
    }

    // Store current user info
    this.currentUserId = userId || null;
    this.currentRole = role || null;
    this.isManuallyDisconnected = false;

    // Connect directly to the Socket.IO server (Render/Vercel/other)
    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    this.currentUrl = socketUrl;

    console.log('🔌 WebSocket: Connecting to:', socketUrl, 'for user:', userId, 'role:', role);

    this.socket = io(socketUrl, {
      auth: {
        userId
      },
      query: {
        role
      },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: false  // Don't force new connection, reuse existing
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected successfully');
      this.reconnectAttempts = 0;
      this.lastHeartbeat = Date.now();

      // Start heartbeat and connection monitoring
      this.startHeartbeat();
      this.startConnectionMonitoring();

      // Stop polling fallback since WebSocket is connected
      this.stopPollingFallback();

      // Rejoin active auctions
      this.activeAuctionIds.forEach(auctionId => {
        this.socket?.emit('join_auction', auctionId);
      });

      // Request current connected users list
      this.socket?.emit('get_connected_users');

      // Notify connection status callbacks
      this.connectionStatusCallbacks.forEach(callback => callback(true));
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.stopHeartbeat();
      this.stopConnectionMonitoring();

      // Notify connection status callbacks
      this.connectionStatusCallbacks.forEach(callback => callback(false));

      // Start polling fallback if there are active auctions
      if (this.activeAuctionIds.size > 0) {
        this.startPollingFallback();
      }

      // Only auto-reconnect if not manually disconnected
      if (!this.isManuallyDisconnected && reason !== 'io client disconnect') {
        console.log('🔄 WebSocket: Scheduling reconnection in 2 seconds...');
        setTimeout(() => {
          if (!this.isManuallyDisconnected && this.currentUserId && this.currentRole) {
            console.log('🔄 WebSocket: Attempting reconnection...');
            this.connect(this.currentUserId, this.currentRole);
          }
        }, 2000);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.handleReconnect();
    });

    // Listen for test messages
    this.socket.on('test_message', (message: TestMessage) => {
      this.testMessageCallbacks.forEach(callback => callback(message));
    });

    // Listen for connected users updates
    this.socket.on('connected_users', (users: ConnectedUser[]) => {
      this.connectedUsersCallbacks.forEach(callback => callback(users));
    });

    // Handle pong response to track connection health
    this.socket.on('pong', () => {
      this.lastHeartbeat = Date.now();
    });

    return this.socket;
  }

  disconnect() {
    this.isManuallyDisconnected = true;
    this.stopHeartbeat();
    this.stopConnectionMonitoring();
    this.stopPollingFallback();
    this.activeAuctionIds.clear();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentUserId = null;
    this.currentRole = null;
    this.currentUrl = null;

    // Notify connection status callbacks
    this.connectionStatusCallbacks.forEach(callback => callback(false));
  }

  private startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing heartbeat
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        // Send a ping to keep connection alive and update last heartbeat
        this.socket.emit('ping');
        this.lastHeartbeat = Date.now();
      }
    }, 30000); // Every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private startConnectionMonitoring() {
    this.stopConnectionMonitoring();
    this.connectionCheckInterval = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;

      // If no heartbeat for more than 45 seconds, connection might be stale
      if (timeSinceLastHeartbeat > 45000 && this.socket?.connected) {
        console.warn('⚠️ WebSocket: Connection appears stale, reconnecting...');
        this.socket.disconnect();
        // Reconnect will happen in disconnect handler
      }
    }, 30000); // Check every 30 seconds
  }

  private stopConnectionMonitoring() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
  }

  private startPollingFallback() {
    if (this.pollingInterval) return; // Already polling

    console.log('🔄 WebSocket: Starting polling fallback for auction updates, active auctions:', Array.from(this.activeAuctionIds));
    this.usePollingFallback = true;

    this.pollingInterval = setInterval(async () => {
      if (this.activeAuctionIds.size > 0) {
        await this.pollAuctionUpdates();
      }
    }, 3000); // Poll every 3 seconds
  }

  private stopPollingFallback() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.usePollingFallback = false;
    }
  }

  private async pollAuctionUpdates() {
    try {
      for (const auctionId of this.activeAuctionIds) {
        const response = await fetch(`/api/auctions/${auctionId}/updates?since=${this.lastPollingTimestamp}`);
        if (response.ok) {
          const updates: AuctionUpdate[] = await response.json();
          updates.forEach(update => {
            this.auctionUpdateCallbacks.forEach(callback => callback(update));
            this.lastPollingTimestamp = Math.max(this.lastPollingTimestamp, update.timestamp);
          });
        }
      }
    } catch (error) {
      console.error('Polling fallback error:', error);
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
      setTimeout(() => {
        console.log('Attempting reconnection...');
        this.socket?.connect();
      }, 1000 * Math.min(this.reconnectAttempts, 5));
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  joinAuction(auctionId: string) {
    this.activeAuctionIds.add(auctionId);

    if (this.socket?.connected) {
      this.socket.emit('join_auction', auctionId);
    } else if (!this.usePollingFallback) {
      // Start polling fallback if WebSocket is not connected
      this.startPollingFallback();
    }
  }

  leaveAuction(auctionId: string) {
    this.activeAuctionIds.delete(auctionId);
    this.socket?.emit('leave_auction', auctionId);

    // Stop polling if no active auctions
    if (this.activeAuctionIds.size === 0) {
      this.stopPollingFallback();
    }
  }

  syncTimer(auctionId: string, timeRemaining: number) {
    this.socket?.emit('sync_timer', { auctionId, timeRemaining });
  }

  placeBid(auctionId: string, playerId: string, amount: number, teamId: string) {
    this.socket?.emit('place_bid', {
      auctionId,
      playerId,
      amount,
      teamId
    });
  }

  onTestMessage(callback: (message: TestMessage) => void) {
    this.testMessageCallbacks.push(callback);
    return () => {
      this.testMessageCallbacks = this.testMessageCallbacks.filter(cb => cb !== callback);
    };
  }

  offTestMessage(callback: (message: TestMessage) => void) {
    this.testMessageCallbacks = this.testMessageCallbacks.filter(cb => cb !== callback);
  }

  offConnectedUsers(callback: (users: ConnectedUser[]) => void) {
    this.connectedUsersCallbacks = this.connectedUsersCallbacks.filter(cb => cb !== callback);
  }

  sendTestMessage(auctionId: string, message: string, role: string) {
    this.socket?.emit('test_message', { auctionId, message, role });
  }

  onConnectedUsers(callback: (users: ConnectedUser[]) => void) {
    this.connectedUsersCallbacks.push(callback);
    return () => {
      this.connectedUsersCallbacks = this.connectedUsersCallbacks.filter(cb => cb !== callback);
    };
  }

  onAuctionEvent(callback: (event: AuctionEvent) => void) {
    this.socket?.on('auction_event', callback);
    return () => {
      this.socket?.off('auction_event', callback);
    };
  }

  on(event: string, callback: (data: any) => void) {
    this.socket?.on(event, callback);
    return () => {
      this.socket?.off(event, callback);
    };
  }

  off(event: string, callback: (data: any) => void) {
    this.socket?.off(event, callback);
  }

  onConnectionStatus(callback: (isConnected: boolean) => void) {
    this.connectionStatusCallbacks.push(callback);
    // Return current status immediately
    callback(this.socket?.connected || false);
    return () => {
      this.connectionStatusCallbacks = this.connectionStatusCallbacks.filter(cb => cb !== callback);
    };
  }

  offConnectionStatus(callback: (isConnected: boolean) => void) {
    this.connectionStatusCallbacks = this.connectionStatusCallbacks.filter(cb => cb !== callback);
  }

  onAuctionUpdate(callback: (update: AuctionUpdate) => void) {
    this.auctionUpdateCallbacks.push(callback);
    return () => {
      this.auctionUpdateCallbacks = this.auctionUpdateCallbacks.filter(cb => cb !== callback);
    };
  }

  offAuctionUpdate(callback: (update: AuctionUpdate) => void) {
    this.auctionUpdateCallbacks = this.auctionUpdateCallbacks.filter(cb => cb !== callback);
  }

  // Get current connection status
  get isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get connection info for debugging
  getConnectionInfo() {
    return {
      connected: this.socket?.connected || false,
      userId: this.currentUserId,
      role: this.currentRole,
      url: this.currentUrl,
      lastHeartbeat: new Date(this.lastHeartbeat).toISOString(),
      reconnectAttempts: this.reconnectAttempts,
      usePollingFallback: this.usePollingFallback
    };
  }
}

export default WebSocketManager; 