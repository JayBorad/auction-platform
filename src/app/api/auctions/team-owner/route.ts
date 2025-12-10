import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Auction from '@/models/Auction';
import { getCurrentUser } from '@/lib/auth';

// Add interface at the top with other imports
interface BaseAuction {
  _id: any;
  name: any;
  tournament: { _id: any; name: any; };
  status: any;
  startDate: any;
  endDate: any;
  participants: any;
  totalPlayers: any;
  soldPlayers: any;
  budget: any;
  description: any;
  currentPlayer?: {
    _id: any;
    name: string;
    role: string;
    basePrice: number;
    currentBid: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's team
    const userTeam = user.team;
    if (!userTeam) {
      return NextResponse.json(
        { success: false, error: 'User not associated with a team' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    // Build query
    const query: any = {
      'participants.team': userTeam
    };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'tournament.name': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const totalItems = await Auction.countDocuments(query);

    // Get auctions with populated data
    const auctions = await Auction.find(query)
      .populate('tournament', 'name')
      .populate('currentPlayer', 'name role basePrice')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Transform auction data for team-owner view
    const auctionsData = auctions.map((auction: any) => {
      const calculatedTotalPlayers = (auction.soldPlayers || 0) + (auction.unsoldPlayers || 0) + (auction.playerQueue?.length || 0);
      // Update the type annotation here
      const baseAuction: BaseAuction = {
        _id: auction._id,
        name: auction.name,
        tournament: {
          _id: auction.tournament?._id || '',
          name: auction.tournament?.name || 'Unknown Tournament'
        },
        status: auction.status,
        startDate: auction.startDate,
        endDate: auction.endDate,
        participants: Array.isArray(auction.participants) ? auction.participants.length : 0,
        totalPlayers: calculatedTotalPlayers,
        soldPlayers: auction.soldPlayers || 0,
        budget: auction.budget || 400000000,
        description: auction.description
      };

      // Add current player data for live auctions
      if (auction.status === 'live' && auction.currentPlayer) {
        baseAuction.currentPlayer = {
          _id: auction.currentPlayer._id,
          name: auction.currentPlayer.name,
          role: auction.currentPlayer.role,
          basePrice: auction.currentPlayer.basePrice,
          currentBid: (auction.currentPlayer.basePrice || 1000000) * (1 + Math.random() * 0.5) // Mock current bid
        };
      }

      return baseAuction;
    });

    const stats = await Auction.aggregate([
      {
        $group: {
          _id: null,
          totalAuctions: { $sum: 1 },
          liveAuctions: {
            $sum: { $cond: [{ $eq: ['$status', 'live'] }, 1, 0] }
          },
          upcomingAuctions: {
            $sum: { $cond: [{ $eq: ['$status', 'upcoming'] }, 1, 0] }
          },
          completedAuctions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalBudget: { $sum: '$totalBudget' },
          totalPlayers: { $sum: '$totalPlayers' },
          totalSoldPlayers: { $sum: '$soldPlayers' }
        }
      }
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      success: true,
      data: auctionsData,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      stats: stats[0] || {
        totalAuctions: 0,
        liveAuctions: 0,
        upcomingAuctions: 0,
        completedAuctions: 0,
        totalBudget: 0,
        totalPlayers: 0,
        totalSoldPlayers: 0
      }
    });

  } catch (error) {
    console.error('Error fetching auctions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch auctions' },
      { status: 500 }
    );
  }
} 