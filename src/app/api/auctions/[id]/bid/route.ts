import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Auction from '@/models/Auction';
import Bid from '@/models/Bid';
import Team from '@/models/Team';
import { getCurrentUser } from '@/lib/auth';
import { formatCurrency } from '@/lib/format';

interface Params {
  params: {
    id: string;
  };
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const { amount, bidType = 'regular', bidder: bidderFromBody, finalize = false } = body;

    // Get the authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!amount) {
      return NextResponse.json(
        { success: false, error: 'Bid amount is required' },
        { status: 400 }
      );
    }

    let bidder: any = null;
    if (user.role === 'team-owner') {
      // Use user's own team
      const userWithTeam = await mongoose.model('User').findById(user.id).populate('team');
      if (!userWithTeam?.team) {
        return NextResponse.json(
          { success: false, error: 'No team associated with user' },
          { status: 400 }
        );
      }
      bidder = userWithTeam.team._id;
    } else if (user.role === 'admin' || user.role === 'moderator') {
      // Admin/mod can pass a bidder in body
      if (!bidderFromBody) {
        return NextResponse.json(
          { success: false, error: 'Bidder team is required for admin/mod bids' },
          { status: 400 }
        );
      }
      bidder = bidderFromBody;
    } else {
      return NextResponse.json(
        { success: false, error: 'Not allowed to place bids' },
        { status: 403 }
      );
    }

    // Get auction with current player
    const auction = await Auction.findById(id)
      .populate('currentPlayer', 'name role basePrice')
      .populate('participants.team', 'name');

    if (!auction) {
      return NextResponse.json(
        { success: false, error: 'Auction not found' },
        { status: 404 }
      );
    }

    // Check if auction is live
    if (auction.status !== 'live') {
      return NextResponse.json(
        { success: false, error: 'Auction is not live' },
        { status: 400 }
      );
    }

    // Check if there's a current player
    if (!auction.currentPlayer) {
      return NextResponse.json(
        { success: false, error: 'No current player in auction' },
        { status: 400 }
      );
    }

    // Validate bidder exists and is a participant
    const bidderTeam = await Team.findById(bidder);
    if (!bidderTeam) {
      return NextResponse.json(
        { success: false, error: 'Bidder team not found' },
        { status: 404 }
      );
    }

    const participant = auction.participants.find(
      (p: any) => p.team._id.toString() === bidder.toString()
    );

    if (!participant) {
      return NextResponse.json(
        { success: false, error: 'Team is not a participant in this auction' },
        { status: 400 }
      );
    }

    // Validate bid amount
    const currentHighestBid = auction.currentBid.amount || auction.currentPlayer.basePrice;
    const minimumBid = currentHighestBid + auction.rules.maxBidIncrement;

    if (amount < minimumBid) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Minimum bid is ${formatCurrency(minimumBid)}`,
          minimumBid 
        },
        { status: 400 }
      );
    }

    // Check if bidder has enough budget
    if (amount > participant.remainingBudget) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient budget. Available: ${formatCurrency(participant.remainingBudget)}`,
          availableBudget: participant.remainingBudget
        },
        { status: 400 }
      );
    }

    // Get previous highest bid for this player and compute next bid order explicitly
    const previousHighestBid = await (Bid as any).getHighestBid(id, auction.currentPlayer._id);
    const lastBidForOrder = await Bid.findOne({ auction: id, player: auction.currentPlayer._id })
      .sort({ bidOrder: -1 })
      .lean() as { bidOrder?: number } | null;
    const nextBidOrder =
      lastBidForOrder && typeof lastBidForOrder.bidOrder === 'number'
        ? lastBidForOrder.bidOrder + 1
        : 1;

    // Create new bid
    const newBid = new Bid({
      auction: id,
      player: auction.currentPlayer._id,
      bidder,
      bidderName: bidderTeam.name,
      amount,
      bidType,
      status: 'active',
      bidOrder: nextBidOrder,
      metadata: {
        deviceInfo: request.headers.get('user-agent') || '',
        ipAddress: request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown'
      }
    });

    await newBid.save();

    // Update auction's current bid
    auction.currentBid = {
      amount,
      bidder,
      bidderName: bidderTeam.name
    };

    await auction.save();

    // Emit WebSocket event for real-time bid updates
    (process as NodeJS.EventEmitter).emit('auction_bid_placed', {
      auctionId: id,
      bid: newBid,
      bidderName: bidderTeam.name,
      amount: amount,
      playerName: auction.currentPlayer.name
    });

    // Reset timer to 30 seconds for new bid
    (process as NodeJS.EventEmitter).emit('timer_sync', { auctionId: id, timeRemaining: 30 });

    // If admin requested finalize, immediately sell player and move to next
    if (finalize && auction.currentPlayer) {
      // Capture player ID before we modify auction
      const soldPlayerId = (auction.currentPlayer as any)?._id?.toString ? (auction.currentPlayer as any)._id.toString() : auction.currentPlayer?.toString();
      
      // Mark new bid as won
      newBid.status = 'won';
      await newBid.save();

      // Update player
      await mongoose.model('Player').findByIdAndUpdate(soldPlayerId, {
        status: 'sold',
        soldPrice: amount,
        team: bidder,
        $push: {
          auctionHistory: {
            auction: auction._id,
            finalPrice: amount,
            winner: bidder,
            status: 'sold',
            year: new Date().getFullYear()
          }
        }
      });

      // Update auction stats and participant budget/players
      auction.soldPlayers += 1;
      const participantIndex = auction.participants.findIndex((p: any) => {
        const teamId = p?.team?._id?.toString ? p.team._id.toString() : p?.team?.toString?.();
        return teamId === bidder.toString();
      });
      if (participantIndex !== -1) {
        auction.participants[participantIndex].remainingBudget -= amount;
        // Ensure playersWon exists
        if (!Array.isArray(auction.participants[participantIndex].playersWon)) {
          auction.participants[participantIndex].playersWon = [] as any;
        }
        auction.participants[participantIndex].playersWon.push(soldPlayerId);
      }

      // Remove current player from queue
      auction.playerQueue = auction.playerQueue.filter((pid: any) => {
        const pidStr = pid?._id?.toString ? pid._id.toString() : pid.toString();
        return pidStr !== soldPlayerId;
      });

      // Move to next player or complete
      if (auction.playerQueue.length > 0) {
        const nextPlayerId = auction.playerQueue[0]?._id?.toString ? auction.playerQueue[0]._id : auction.playerQueue[0];
        const nextPlayer = await mongoose.model('Player').findById(nextPlayerId).select('basePrice');
        auction.currentPlayer = nextPlayerId;
        auction.currentBid = {
          amount: nextPlayer?.basePrice || 0,
          bidder: null as any,
          bidderName: 'Starting Price'
        } as any;
      } else {
        auction.status = 'completed';
        auction.currentPlayer = null as any;
        auction.currentBid = {
          amount: 0,
          bidder: null as any,
          bidderName: ''
        } as any;
      }

      await auction.save();
      
      // Emit player_sold event with player and team details (use captured playerId)
      const soldPlayer: any = await mongoose.model('Player').findById(soldPlayerId).select('name role image').lean();
      const winningTeam: any = await Team.findById(bidder).select('name logo').lean();
      
      (process as NodeJS.EventEmitter).emit('player_sold', {
        auctionId: id,
        player: {
          _id: soldPlayer?._id,
          name: soldPlayer?.name,
          role: soldPlayer?.role,
          image: soldPlayer?.image
        },
        team: {
          _id: winningTeam?._id,
          name: winningTeam?.name,
          logo: winningTeam?.logo
        },
        amount: amount
      });
    }

    // Populate the new bid for response
    await newBid.populate('player', 'name role basePrice');
    await newBid.populate('bidder', 'name');

    // Get updated bid history for the (previous) player
    const bidHistory = await (Bid as any).getBidHistory(id, newBid.player._id);

    // Update in-memory participant playersWon to reflect populated data quickly (optional)
    // Not returning auction here; UI refetches auction details after finalize

    // Calculate bid statistics
    const bidStats = {
      totalBids: bidHistory.length,
      highestBid: bidHistory.length > 0 ? Math.max(...bidHistory.map((b: any) => b.amount)) : amount,
      bidIncrement: amount - currentHighestBid,
      participatingTeams: [...new Set(bidHistory.map((b: any) => b.bidderName))].length
    };

    return NextResponse.json({
      success: true,
      data: {
        bid: newBid,
        bidHistory,
        stats: bidStats
      },
      message: finalize ? 'Player sold and moved to next' : 'Bid placed successfully'
    });

  } catch (error) {
    console.error('Error placing bid:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to place bid' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    await connectDB();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('player');
    const limit = parseInt(searchParams.get('limit') || '20');

    const auction = await Auction.findById(id);
    if (!auction) {
      return NextResponse.json(
        { success: false, error: 'Auction not found' },
        { status: 404 }
      );
    }

    let bids;
    if (playerId) {
      // Get bid history for specific player
      bids = await Bid.find({ auction: id, player: playerId })
        .sort({ createdAt: -1 })
        .populate('player', 'name role')
        .populate('bidder', 'name');
    } else {
      // Get all recent bids for the auction
      bids = await Bid.find({ auction: id })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('player', 'name role')
        .populate('bidder', 'name');
    }

    // Calculate bid statistics
    const allBids = await Bid.find({ auction: id });
    const stats = {
      totalBids: allBids.length,
      totalBidders: [...new Set(allBids.map(b => b.bidder.toString()))].length,
      averageBid: allBids.length > 0 ? 
        allBids.reduce((sum, bid) => sum + bid.amount, 0) / allBids.length : 0,
      highestBid: allBids.length > 0 ? 
        Math.max(...allBids.map(b => b.amount)) : 0,
      activeBids: allBids.filter(b => b.status === 'active').length,
      wonBids: allBids.filter(b => b.status === 'won').length
    };

    return NextResponse.json({
      success: true,
      data: {
        bids,
        stats
      }
    });

  } catch (error) {
    console.error('Error fetching bids:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bids' },
      { status: 500 }
    );
  }
} 