const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
// Bind to all interfaces in production to work behind reverse proxies/load balancers
const hostname = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  
  // Configure allowed origins for Socket.IO CORS
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
    : (dev
        ? ['http://localhost:3000']
        : ['https://auction-seven-pied.vercel.app']);

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
      transports: ['websocket', 'polling']
    },
    allowEIO3: true,  // Enable compatibility mode
    transports: ['websocket', 'polling']  // Enable both WebSocket and polling
  });

  // Store active auctions and their participants
  const activeAuctions = new Map();
  const auctionTimers = new Map();
  const connectedUsers = new Map(); // Map to store connected users by socket ID

  // Helper function to broadcast connected users
  const broadcastConnectedUsers = () => {
    const users = Array.from(connectedUsers.values());
    io.emit('connected_users', users);
  };

  io.on('connection', (socket) => {
    console.log('New client connected');
    
    // Get user info from auth and query
    const userId = socket.handshake.auth.userId;
    const role = socket.handshake.query.role;
    
    // Store user info
    if (userId && role) {
      connectedUsers.set(socket.id, {
        role,
        timestamp: new Date()
      });
      broadcastConnectedUsers();
    }

    // Handle get_connected_users request
    socket.on('get_connected_users', () => {
      const users = Array.from(connectedUsers.values());
      socket.emit('connected_users', users);
    });

    // Handle auction room events
    socket.on('join_auction', (auctionId) => {
      socket.join(`auction:${auctionId}`);
      
      // Add user to auction participants
      if (!activeAuctions.has(auctionId)) {
        activeAuctions.set(auctionId, new Set());
      }
      activeAuctions.get(auctionId).add(socket.id);
      
      console.log(`Client joined auction: ${auctionId}`);
    });
    
    socket.on('leave_auction', (auctionId) => {
      socket.leave(`auction:${auctionId}`);
      
      // Remove user from auction participants
      if (activeAuctions.has(auctionId)) {
        activeAuctions.get(auctionId).delete(socket.id);
      }
      
      console.log(`Client left auction: ${auctionId}`);
    });
    
    socket.on('place_bid', (data) => {
      const { auctionId } = data;
      io.to(`auction:${auctionId}`).emit('auction_event', {
        type: 'bid_placed',
        auctionId,
        data
      });
    });

    socket.on('sync_timer', (data) => {
      const { auctionId, timeRemaining } = data;
      io.to(`auction:${auctionId}`).emit('auction_event', {
        type: 'timer_sync',
        auctionId,
        data: { timeLeft: timeRemaining }
      });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
      
      // Remove user from connected users
      connectedUsers.delete(socket.id);
      broadcastConnectedUsers();
      
      // Remove user from all active auctions
      activeAuctions.forEach((participants, auctionId) => {
        if (participants.has(socket.id)) {
          participants.delete(socket.id);
        }
      });
    });
  });

  process.on('auction_paused', (data) => {
    const { auctionId } = data;
    io.to(`auction:${auctionId}`).emit('auction_event', {
      type: 'auction_paused',
      auctionId,
      data
    });
     // Emit global event for auction list updates
     io.emit('auction_status_changed', {
      type: 'auction_paused',
      auctionId,
      data
    });
  });
  
  process.on('auction_resumed', (data) => {
    const { auctionId } = data;
    io.to(`auction:${auctionId}`).emit('auction_event', {
      type: 'auction_resumed',
      auctionId,
      data
    });
    // Emit global event for auction list updates
    io.emit('auction_status_changed', {
      type: 'auction_resumed',
      auctionId,
      data
    });
  });

  process.on('auction_bid_placed', (data) => {
    const { auctionId } = data;
    console.log(`[WebSocket] Broadcasting bid_placed event for auction: ${auctionId}`);
    io.to(`auction:${auctionId}`).emit('auction_event', {
      type: 'bid_placed',
      auctionId,
      data
    });
  });

  process.on('timer_sync', (data) => {
    const { auctionId, timeRemaining } = data;
    io.to(`auction:${auctionId}`).emit('auction_event', {
      type: 'timer_sync',
      auctionId,
      data: { timeLeft: timeRemaining }
    });
  });

  // Add these new event listeners
  process.on('auction_started', (data) => {
    const { auctionId } = data;
    io.to(`auction:${auctionId}`).emit('auction_event', {
      type: 'auction_started',
      auctionId,
      data
    });
    // Emit global event for auction list updates
    io.emit('auction_status_changed', {
      type: 'auction_started',
      auctionId,
      data
    });
  });

  // Add these new event listeners
  process.on('auction_ended', (data) => {
    const { auctionId } = data;
    io.to(`auction:${auctionId}`).emit('auction_event', {
      type: 'auction_ended',
      auctionId,
      data
    });
    // Emit global event for auction list updates
    io.emit('auction_status_changed', {
      type: 'auction_ended',
      auctionId,
      data
    });
  });

  process.on('player_changed', (data) => {
    const { auctionId } = data;
    console.log(`[WebSocket] Broadcasting player_changed event for auction: ${auctionId}`);
    io.to(`auction:${auctionId}`).emit('auction_event', {
      type: 'player_changed',
      auctionId,
      data
    });
  });

  process.on('player_sold', (data) => {
    const { auctionId } = data;
    console.log(`[WebSocket] Broadcasting player_sold event for auction: ${auctionId}`, data);
    // Broadcast to all team owners in the auction room
    io.to(`auction:${auctionId}`).emit('auction_event', {
      type: 'player_sold',
      auctionId,
      data
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}); 