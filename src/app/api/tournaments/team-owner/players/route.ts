import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Tournament from '@/models/Tournament';
import Team from '@/models/Team';
import Player from '@/models/Player';
import Auction from '@/models/Auction';
import mongoose from 'mongoose';

// Function to get user from cookies
function getUserFromCookies(request: NextRequest) {
  try {
    const userCookie = request.cookies.get('user')?.value;
    if (!userCookie) return null;
    
    return JSON.parse(decodeURIComponent(userCookie));
  } catch (e) {
    console.error('Error parsing user cookie:', e);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get current user from cookies
    const user = getUserFromCookies(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('tournamentId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const teamId = searchParams.get('teamId') || '';

    // Get user's team
    const userTeam = await Team.findOne({ _id: user.team }).lean();
    if (!userTeam) {
      return NextResponse.json({
        success: false,
        error: 'User team not found'
      }, { status: 404 });
    }

    console.log('User team found:', (userTeam as any).name, 'ID:', (userTeam as any)._id);

    let query: any = {};

    // Always filter by user's team first
    query = { team: (userTeam as any)._id };

    // If tournamentId is provided, further filter by tournament
    if (tournamentId && mongoose.Types.ObjectId.isValid(tournamentId)) {
      // Get tournament to find which players are in the tournament
      const tournament = await Tournament.findById(tournamentId).lean();
      if (!tournament) {
        return NextResponse.json({
          success: false,
          error: 'Tournament not found'
        }, { status: 404 });
      }

      // Get all auctions for this tournament
      const auctions = await Auction.find({ tournament: tournamentId }).lean();
      const auctionIds = auctions.map(auction => auction._id);

      // Get players from user's team who were sold in these auctions
      const soldPlayers = await Player.find({
        team: (userTeam as any)._id,
        auctionHistory: {
          $elemMatch: {
            auction: { $in: auctionIds },
            status: 'sold'
          }
        }
      }).lean();

      // Update query to only include players sold in this tournament
      query = {
        _id: { $in: soldPlayers.map(p => p._id) },
        team: (userTeam as any)._id
      };
    }

    // Apply additional filters
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nationality: { $regex: search, $options: 'i' } }
      ];
    }

    if (role && role !== 'all') {
      query.role = role;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    // Get total count for pagination
    const totalCount = await Player.countDocuments(query);

    // Get players with pagination
    const players = await Player.find(query)
      .populate('team', 'name logo city')
      .sort({ basePrice: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    console.log('Query used:', JSON.stringify(query, null, 2));
    console.log('Players found:', players.length);

    // Get tournament information if tournamentId is provided
    let tournamentInfo = null;
    if (tournamentId && mongoose.Types.ObjectId.isValid(tournamentId)) {
      tournamentInfo = await Tournament.findById(tournamentId)
        .select('name description status startDate endDate format')
        .lean();
    }

    // Get team information for all teams involved
    const teamIds = [...new Set(players.map(p => p.team?._id).filter(Boolean))];
    const teams = await Team.find({ _id: { $in: teamIds } })
      .select('name logo city owner')
      .lean();

    // Get tournaments where user's team is participating
    const userTournaments = await Tournament.find({
      'participatingTeams.team': (userTeam as any)._id
    })
      .select('name description status startDate endDate format')
      .sort({ startDate: -1 })
      .lean();

    // Calculate statistics
    const stats = {
      totalPlayers: totalCount,
      playersByRole: players.reduce((acc: any, player: any) => {
        acc[player.role] = (acc[player.role] || 0) + 1;
        return acc;
      }, {}),
      totalValue: players.reduce((sum: number, player: any) => sum + (player.basePrice || 0), 0),
      averagePrice: players.length > 0 ? players.reduce((sum: number, player: any) => sum + (player.basePrice || 0), 0) / players.length : 0
    };

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: {
        players,
        tournaments: userTournaments,
        tournament: tournamentInfo,
        teams,
        stats,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching tournament players:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tournament players' },
      { status: 500 }
    );
  }
}
