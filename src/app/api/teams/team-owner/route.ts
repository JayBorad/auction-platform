import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Team from '@/models/Team';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    // Build query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { shortName: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { state: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status && status !== 'all') {
      if (status === 'active') {
        query.isActive = true;
      } else if (status === 'inactive') {
        query.isActive = false;
      }
    }

    const skip = (page - 1) * limit;

    // Get teams with populated data
    const [teams, totalCount] = await Promise.all([
      Team.find(query)
        .populate('tournaments', 'name status startDate')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Team.countDocuments(query)
    ]);

    // Transform team data for team-owner view
    const teamsData = teams.map((team: any) => ({
      _id: team._id,
      name: team.name,
      shortName: team.shortName,
      logo: team.logo,
      description: team.description,
      city: team.city,
      state: team.state,
      country: team.country,
      foundedYear: team.foundedYear,
      homeGround: team.homeGround,
      budget: team.budget,
      isActive: team.isActive,
      status: team.isActive ? 'active' : 'inactive',
      owner: null, // Owner field not available in current schema
      players: team.players || [],
      tournaments: team.tournaments || [],
      // Calculated fields
      totalMatches: team.totalMatches || 0,
      matchesWon: team.matchesWon || 0,
      matchesLost: team.matchesLost || 0,
      matchesDrawn: team.matchesDrawn || 0,
      points: team.points || 0,
      winPercentage: team.totalMatches > 0 ? 
        ((team.matchesWon / team.totalMatches) * 100).toFixed(2) : '0.00',
      playerCount: team.players?.filter((p: any) => p.isActive).length || 0,
      activeTournaments: team.tournaments?.filter((t: any) => t.status === 'active').length || 0,
      founded: team.foundedYear || new Date().getFullYear()
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: teamsData,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
} 