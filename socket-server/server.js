const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = createServer(app);

// Configure CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : ['http://localhost:3000', 'https://auction-platform.vercel.app'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API endpoint to receive events from auction API routes
app.post('/api/events', express.json(), (req, res) => {
  try {
    const { event, data } = req.body;

    if (!event || !data) {
      return res.status(400).json({ error: 'Missing event or data' });
    }

    // Emit the event to connected clients
    if (event === 'auction_paused') {
      process.emit('auction_paused', data);
    } else if (event === 'auction_resumed') {
      process.emit('auction_resumed', data);
    } else if (event === 'auction_bid_placed') {
      process.emit('auction_bid_placed', data);
    } else if (event === 'timer_sync') {
      process.emit('timer_sync', data);
    } else if (event === 'auction_started') {
      process.emit('auction_started', data);
    } else if (event === 'auction_ended') {
      process.emit('auction_ended', data);
    } else if (event === 'player_changed') {
      process.emit('player_changed', data);
    } else if (event === 'player_sold') {
      process.emit('player_sold', data);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Store active auctions and their participants
const activeAuctions = new Map();
const connectedUsers = new Map();
const auctionTimers = new Map();

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
    transports: ['websocket', 'polling']
  },
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Helper function to broadcast connected users
const broadcastConnectedUsers = () => {
  const users = Array.from(connectedUsers.values());
  io.emit('connected_users', users);
};

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

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

  // Handle ping for connection health check
  socket.on('ping', () => {
    socket.emit('pong');
  });

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);

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

// Handle auction events from API routes (if needed)
process.on('auction_paused', (data) => {
  const { auctionId } = data;
  io.to(`auction:${auctionId}`).emit('auction_event', {
    type: 'auction_paused',
    auctionId,
    data
  });
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

process.on('auction_started', (data) => {
  const { auctionId } = data;
  io.to(`auction:${auctionId}`).emit('auction_event', {
    type: 'auction_started',
    auctionId,
    data
  });
  io.emit('auction_status_changed', {
    type: 'auction_started',
    auctionId,
    data
  });
});

process.on('auction_ended', (data) => {
  const { auctionId } = data;
  io.to(`auction:${auctionId}`).emit('auction_event', {
    type: 'auction_ended',
    auctionId,
    data
  });
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
  io.to(`auction:${auctionId}`).emit('auction_event', {
    type: 'player_sold',
    auctionId,
    data
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`);
  console.log(`📡 Accepting connections from: ${allowedOrigins.join(', ')}`);
});
