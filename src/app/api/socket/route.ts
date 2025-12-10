import { NextRequest } from 'next/server';
import { Server as ServerIO } from 'socket.io';
import { Server as NetServer } from 'http';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

// Store active auctions and their participants (in-memory for serverless)
const activeAuctions = new Map<string, Set<string>>();
const connectedUsers = new Map<string, { role: string; timestamp: Date }>();
const auctionTimers = new Map<string, NodeJS.Timeout>();

// Helper function to broadcast connected users
const broadcastConnectedUsers = (io: ServerIO) => {
  const users = Array.from(connectedUsers.values());
  io.emit('connected_users', users);
};

// Initialize Socket.IO server
let io: ServerIO | null = null;

export async function GET(request: NextRequest) {
  // This route handles WebSocket upgrades for Socket.IO
  const headersList = await headers();

  // Check if this is a Socket.IO handshake request
  if (headersList.get('upgrade') === 'websocket') {
    try {
      // Initialize Socket.IO if not already done
      if (!io) {
        // Create a mock HTTP server for Socket.IO
        const httpServer = {
          listen: () => {},
          close: () => {},
        } as any;

        // Configure allowed origins for Socket.IO CORS
        const allowedOrigins = process.env.ALLOWED_ORIGINS
          ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
          : [process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'];

        io = new ServerIO(httpServer, {
          cors: {
            origin: allowedOrigins,
            methods: ['GET', 'POST'],
            credentials: true
          },
          allowEIO3: true,
          transports: ['websocket', 'polling'],
          pingTimeout: 60000,
          pingInterval: 25000
        });

        // Set up Socket.IO event handlers
        io.on('connection', (socket) => {
          console.log('New client connected:', socket.id);

          // Get user info from auth and query
          const userId = socket.handshake.auth.userId;
          const role = socket.handshake.query.role as string;

          // Store user info
          if (userId && role) {
            connectedUsers.set(socket.id, {
              role,
              timestamp: new Date()
            });
            broadcastConnectedUsers(io!);
          }

          // Handle get_connected_users request
          socket.on('get_connected_users', () => {
            const users = Array.from(connectedUsers.values());
            socket.emit('connected_users', users);
          });

          // Handle auction room events
          socket.on('join_auction', (auctionId: string) => {
            socket.join(`auction:${auctionId}`);

            // Add user to auction participants
            if (!activeAuctions.has(auctionId)) {
              activeAuctions.set(auctionId, new Set());
            }
            activeAuctions.get(auctionId)!.add(socket.id);

            console.log(`Client joined auction: ${auctionId}`);
          });

          socket.on('leave_auction', (auctionId: string) => {
            socket.leave(`auction:${auctionId}`);

            // Remove user from auction participants
            if (activeAuctions.has(auctionId)) {
              activeAuctions.get(auctionId)!.delete(socket.id);
            }

            console.log(`Client left auction: ${auctionId}`);
          });

          socket.on('place_bid', (data: any) => {
            const { auctionId } = data;
            io!.to(`auction:${auctionId}`).emit('auction_event', {
              type: 'bid_placed',
              auctionId,
              data
            });
          });

          socket.on('sync_timer', (data: any) => {
            const { auctionId, timeRemaining } = data;
            io!.to(`auction:${auctionId}`).emit('auction_event', {
              type: 'timer_sync',
              auctionId,
              data: { timeLeft: timeRemaining }
            });
          });

          socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);

            // Remove user from connected users
            connectedUsers.delete(socket.id);
            broadcastConnectedUsers(io!);

            // Remove user from all active auctions
            activeAuctions.forEach((participants, auctionId) => {
              if (participants.has(socket.id)) {
                participants.delete(socket.id);
              }
            });
          });
        });

        // Listen for process events (these will be triggered by API routes)
        process.on('auction_paused', (data: any) => {
          const { auctionId } = data;
          io!.to(`auction:${auctionId}`).emit('auction_event', {
            type: 'auction_paused',
            auctionId,
            data
          });
          io!.emit('auction_status_changed', {
            type: 'auction_paused',
            auctionId,
            data
          });
        });

        process.on('auction_resumed', (data: any) => {
          const { auctionId } = data;
          io!.to(`auction:${auctionId}`).emit('auction_event', {
            type: 'auction_resumed',
            auctionId,
            data
          });
          io!.emit('auction_status_changed', {
            type: 'auction_resumed',
            auctionId,
            data
          });
        });

        process.on('auction_bid_placed', (data: any) => {
          const { auctionId } = data;
          console.log(`[WebSocket] Broadcasting bid_placed event for auction: ${auctionId}`);
          io!.to(`auction:${auctionId}`).emit('auction_event', {
            type: 'bid_placed',
            auctionId,
            data
          });
        });

        process.on('timer_sync', (data: any) => {
          const { auctionId, timeRemaining } = data;
          io!.to(`auction:${auctionId}`).emit('auction_event', {
            type: 'timer_sync',
            auctionId,
            data: { timeLeft: timeRemaining }
          });
        });

        process.on('auction_started', (data: any) => {
          const { auctionId } = data;
          io!.to(`auction:${auctionId}`).emit('auction_event', {
            type: 'auction_started',
            auctionId,
            data
          });
          io!.emit('auction_status_changed', {
            type: 'auction_started',
            auctionId,
            data
          });
        });

        process.on('auction_ended', (data: any) => {
          const { auctionId } = data;
          io!.to(`auction:${auctionId}`).emit('auction_event', {
            type: 'auction_ended',
            auctionId,
            data
          });
          io!.emit('auction_status_changed', {
            type: 'auction_ended',
            auctionId,
            data
          });
        });

        process.on('player_changed', (data: any) => {
          const { auctionId } = data;
          console.log(`[WebSocket] Broadcasting player_changed event for auction: ${auctionId}`);
          io!.to(`auction:${auctionId}`).emit('auction_event', {
            type: 'player_changed',
            auctionId,
            data
          });
        });

        process.on('player_sold', (data: any) => {
          const { auctionId } = data;
          console.log(`[WebSocket] Broadcasting player_sold event for auction: ${auctionId}`, data);
          io!.to(`auction:${auctionId}`).emit('auction_event', {
            type: 'player_sold',
            auctionId,
            data
          });
        });
      }

      // Return a response that indicates WebSocket connection is handled
      return new Response('WebSocket connection established', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      });

    } catch (error) {
      console.error('WebSocket initialization error:', error);
      return new Response('WebSocket connection failed', {
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }
  }

  // For regular HTTP requests, return a simple response
  return new Response(JSON.stringify({ message: 'Socket.IO server is running' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
