import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Team from '@/models/Team';
import Tournament from '@/models/Tournament';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const city = searchParams.get('city') || '';
    const tournament = searchParams.get('tournament') || '';
    const status = searchParams.get('status') || 'all'; // all, active, inactive
    const sortBy = searchParams.get('sortBy') || 'name'; // name, points, matches, winPercentage
    const sortOrder = searchParams.get('sortOrder') || 'asc'; // asc, desc

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { shortName: { $regex: search, $options: 'i' } },
        { captain: { $regex: search, $options: 'i' } },
        { coach: { $regex: search, $options: 'i' } }
      ];
    }

    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }

    if (tournament) {
      query.tournaments = tournament;
    }

    if (status !== 'all') {
      query.isActive = status === 'active';
    }

    // Build sort object
    const sortObj: any = {};
    switch (sortBy) {
      case 'points':
        sortObj.points = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'matches':
        sortObj.totalMatches = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'winPercentage':
        // For win percentage, we'll sort by matchesWon/totalMatches ratio
        sortObj.matchesWon = sortOrder === 'desc' ? -1 : 1;
        sortObj.totalMatches = sortOrder === 'desc' ? 1 : -1;
        break;
      default:
        sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    const skip = (page - 1) * limit;

    // Execute query with pagination
    const [teams, totalCount] = await Promise.all([
      Team.find(query)
        .populate('tournaments', 'name status')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Team.countDocuments(query)
    ]);

    // Calculate additional stats for each team
    const teamsWithStats = teams.map(team => ({
      ...team,
      winPercentage: team.totalMatches > 0 ? 
        ((team.matchesWon / team.totalMatches) * 100).toFixed(2) : '0.00',
      playerCount: team.players?.filter((p: any) => p.isActive).length || 0
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: teamsWithStats,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error: any) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'shortName', 'city', 'country', 'contactEmail', 'contactPhone'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Check if team name or short name already exists
    const existingTeam = await Team.findOne({
      $or: [
        { name: body.name },
        { shortName: body.shortName.toUpperCase() }
      ]
    });

    if (existingTeam) {
      return NextResponse.json(
        { 
          success: false, 
          error: existingTeam.name === body.name ? 
            'Team name already exists' : 
            'Team short name already exists' 
        },
        { status: 400 }
      );
    }

    // Extract captain and vice captain names from Player objects
    const captainName = typeof body.captain === 'object' ? body.captain.name : body.captain;
    const viceCaptainName = body.viceCaptain && typeof body.viceCaptain === 'object' ? body.viceCaptain.name : body.viceCaptain;

    // Validate captain is provided
    if (!captainName) {
      return NextResponse.json(
        { success: false, error: 'Captain name is required' },
        { status: 400 }
      );
    }

    // Validate tournaments if provided
    if (body.tournaments && body.tournaments.length > 0) {
      const validTournaments = await Tournament.find({
        _id: { $in: body.tournaments },
        status: { $in: ['upcoming', 'active'] }
      });

      if (validTournaments.length !== body.tournaments.length) {
        return NextResponse.json(
          { success: false, error: 'One or more tournaments are invalid or not accepting registrations' },
          { status: 400 }
        );
      }
    }

    // Prepare players array
    let players = body.players || [];

    // Ensure captain is in players list
    const captainInPlayers = players.some((player: any) => 
      player.name === captainName && player.isActive !== false
    );
    
    if (!captainInPlayers) {
      // Add captain to players if not present
      const captainData = typeof body.captain === 'object' ? body.captain : {
        name: captainName,
        age: 25,
        role: 'all-rounder',
        battingStyle: 'right-hand',
        bowlingStyle: 'none',
        jerseyNumber: 1,
        contactNumber: '',
        email: '',
        isActive: true
      };
      players.push(captainData);
    }

    // Ensure vice captain is in players list if provided
    if (viceCaptainName) {
      const viceCaptainInPlayers = players.some((player: any) => 
        player.name === viceCaptainName && player.isActive !== false
      );
      
      if (!viceCaptainInPlayers) {
        // Add vice captain to players if not present
        const viceCaptainData = typeof body.viceCaptain === 'object' ? body.viceCaptain : {
          name: viceCaptainName,
          age: 25,
          role: 'all-rounder',
          battingStyle: 'right-hand',
          bowlingStyle: 'none',
          jerseyNumber: 2,
          contactNumber: '',
          email: '',
          isActive: true
        };
        players.push(viceCaptainData);
      }
    }

    // Create team with string captain/viceCaptain names
    const team = new Team({
      name: body.name,
      shortName: body.shortName.toUpperCase(),
      description: body.description,
      captain: captainName,
      viceCaptain: viceCaptainName,
      coach: body.coach,
      manager: body.manager,
      homeGround: body.homeGround,
      city: body.city,
      state: body.state,
      country: body.country,
      foundedYear: body.foundedYear,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      website: body.website,
      socialMedia: body.socialMedia,
      players: players,
      tournaments: body.tournaments || [],
      isActive: body.isActive !== false,
      registrationDate: new Date()
    });

    await team.save();

    // Populate tournaments for response
    await team.populate('tournaments', 'name status');

    return NextResponse.json({
      success: true,
      data: team,
      message: 'Team created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating team:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, error: validationErrors.join(', ') },
        { status: 400 }
      );
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json(
        { success: false, error: `${field} already exists` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create team' },
      { status: 500 }
    );
  }
}