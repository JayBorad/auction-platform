import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Auction from '@/models/Auction';
import Tournament from '@/models/Tournament';
import Player from '@/models/Player';
import Team from '@/models/Team';

// Ensure all models are registered
Player;
Team;
Tournament;

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const tournament = searchParams.get('tournament');
    const search = searchParams.get('search');

    // Build query
    const query: any = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (tournament) {
      query.tournament = tournament;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'tournament.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count for pagination
    const total = await Auction.countDocuments(query);

          // Get auctions with pagination
    const auctions = await Auction.find(query)
      .populate('tournament', 'name')
      .populate('currentPlayer', 'name role basePrice')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(); // Use lean() to get plain objects

    // Calculate totalPlayers for each auction
    const auctionsWithCalculatedTotalPlayers = auctions.map(auction => ({
      ...auction,
      totalPlayers: auction.soldPlayers + auction.unsoldPlayers + (auction.playerQueue?.length || 0)
    }));

    // Calculate additional statistics
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

    return NextResponse.json({
      success: true,
      data: {
        auctions: auctionsWithCalculatedTotalPlayers,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalItems: total,
          totalPages: Math.ceil(total / limit)
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

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Check authentication (you might want to implement proper auth)
    // const session = await getServerSession();
    // if (!session) {
    //   return NextResponse.json(
    //     { success: false, error: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }

    const body = await request.json();
    const { name, tournament, startDate, endDate, totalBudget, participants, rules } = body;

    // Validate required fields
    if (!name || !tournament || !startDate || !endDate || !totalBudget) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate tournament exists
    const tournamentExists = await Tournament.findById(tournament);
    if (!tournamentExists) {
      return NextResponse.json(
        { success: false, error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return NextResponse.json(
        { success: false, error: 'Start date must be before end date' },
        { status: 400 }
      );
    }

    if (start < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Start date cannot be in the past' },
        { status: 400 }
      );
    }

    // Create auction
    const auction = new Auction({
      name,
      tournament,
      startDate: start,
      endDate: end,
      totalBudget,
      participants: participants || [],
      rules: rules || {},
      createdBy: '507f1f77bcf86cd799439011' // Replace with actual user ID from session
    });

    await auction.save();

    // Populate the created auction for response
    await auction.populate('tournament', 'name');

    return NextResponse.json({
      success: true,
      data: auction
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating auction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create auction' },
      { status: 500 }
    );
  }
} 