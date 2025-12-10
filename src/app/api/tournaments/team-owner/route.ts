import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Tournament from '@/models/Tournament';
import Team from '@/models/Team';

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    // Get user's team
    const userTeam = await Team.findOne({ _id: user.team }).lean();
    if (!userTeam) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    }

    // Build query - filter tournaments where user's team is participating
    const query: any = {
      'participatingTeams.team': Array.isArray(userTeam) ? userTeam[0]._id : userTeam._id
    };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [tournaments, totalCount] = await Promise.all([
      Tournament.find(query)
        .populate({
          path: 'participatingTeams.team',
          select: 'name logo city owner'
        })
        .populate({
          path: 'playerPool.availablePlayers.player',
          select: 'name role basePrice image nationality age'
        })
        .populate({
          path: 'playerPool.soldPlayers.player',
          select: 'name role basePrice image nationality age'
        })
        .populate({
          path: 'playerPool.unsoldPlayers.player',
          select: 'name role basePrice image nationality age'
        })
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Tournament.countDocuments(query)
    ]);

    // Transform tournament data for team-owner view
    const tournamentsData = tournaments.map((tournament: any) => {
      // Find the user's team entry in participating teams
      const userTeamEntry = tournament.participatingTeams.find(
        (entry: any) => {
          // Handle case where entry.team could be an array or an object
          const entryTeam = Array.isArray(entry.team) ? entry.team[0] : entry.team;
          const userTeamId = Array.isArray(userTeam) ? userTeam[0]?._id : userTeam?._id;
          return entryTeam && userTeamId && entryTeam._id?.toString() === userTeamId.toString();
        }
      );

      return {
        _id: tournament._id,
        name: tournament.name,
        description: tournament.description,
        status: tournament.status,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        location: tournament.location,
        maxTeams: tournament.maxTeams,
        registrationDeadline: tournament.registrationDeadline,
        prizePool: tournament.prizePool,
        entryFee: tournament.entryFee,
        format: tournament.format,
        teams: tournament.registeredTeams || 0,
        isActive: tournament.isActive,
        // Add additional calculated fields
        registrationOpen: new Date() < new Date(tournament.registrationDeadline),
        daysUntilStart: Math.ceil((new Date(tournament.startDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)),
        participatingTeams: tournament.participatingTeams.map((entry: any) => ({
          _id: entry._id,
          team: entry.team,
          budget: entry.budget
        })),
        userTeamEntry: userTeamEntry || null,
        // Add missing fields for team-owner view
        playerPool: tournament.playerPool,
        financial: tournament.financial
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: tournamentsData,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tournaments' },
      { status: 500 }
    );
  }
} 