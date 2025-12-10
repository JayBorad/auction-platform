import { io, Socket } from 'socket.io-client';

export interface AuctionEvent {
  type: 'bid_placed' | 'player_changed' | 'auction_started' | 'auction_ended' | 'timer_update'| 'auction_paused' | 'auction_resumed' | 'timer_sync';
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

class WebSocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private testMessageCallbacks: ((message: TestMessage) => void)[] = [];
  private connectedUsersCallbacks: ((users: ConnectedUser[]) => void)[] = [];

  connect(userId?: string, role?: string) {
    if (this.socket?.connected) return this.socket;

    this.socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000', {
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
      forceNew: true
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected successfully');
      this.reconnectAttempts = 0;
      
      // Request current connected users list
      this.socket?.emit('get_connected_users');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
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

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
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
    this.socket?.emit('join_auction', auctionId);
  }

  leaveAuction(auctionId: string) {
    this.socket?.emit('leave_auction', auctionId);
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
}

export default WebSocketManager; 