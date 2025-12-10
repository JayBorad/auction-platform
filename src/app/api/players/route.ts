import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Player from '@/models/Player';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    const query: any = {};
    
    if (role && role !== 'all') {
      query.role = role;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nationality: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort criteria
    const sortCriteria: any = {};
    sortCriteria[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get total count for pagination
    const total = await Player.countDocuments(query);
    
    // Get players with pagination
    const players = await Player.find(query)
      .populate('team', 'name')
      .sort(sortCriteria)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Add virtual fields manually since we're using lean()
    const playersWithVirtuals = players.map(player => ({
      ...player,
      rating: calculatePlayerRating(player),
      suggestedPrice: calculateSuggestedPrice(player)
    }));

    return NextResponse.json({
      success: true,
      data: {
        players: playersWithVirtuals,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json(
      { success: false, error: error },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      name,
      age,
      role,
      battingHand,
      bowlingHand,
      basePrice,
      nationality,
      image,
      battingStrikeRate,
      runs,
      highestScore,
      bowlingStrikeRate,
      bowlingAverage,
      economy,
      wickets,
      bestBowlingStats,
      recentForm,
      marketValue
    } = body;

    // Validate required fields
    if (!name || !age || !role || !basePrice) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, age, role, basePrice' },
        { status: 400 }
      );
    }

    // Create new player
    const player = new Player({
      name,
      age,
      role,
      battingHand: battingHand || 'Right',
      bowlingHand: bowlingHand || null,
      basePrice,
      nationality: nationality || 'Indian',
      image: image || '',
      battingStrikeRate: battingStrikeRate || 0,
      runs: runs || 0,
      highestScore: highestScore || 0,
      bowlingStrikeRate: bowlingStrikeRate || 0,
      bowlingAverage: bowlingAverage || 0,
      economy: economy || 0,
      wickets: wickets || 0,
      bestBowlingStats: bestBowlingStats || '',
      recentForm: recentForm || 'average',
      marketValue: marketValue || basePrice,
      status: 'available'
    });

    await player.save();

    return NextResponse.json({
      success: true,
      data: {
        player: {
          ...player.toObject(),
          rating: calculatePlayerRating(player.toObject()),
          suggestedPrice: calculateSuggestedPrice(player.toObject())
        }
      }
    });

  } catch (error) {
    console.error('Error creating player:', error);

    // Handle Mongoose validation errors
    let errorMessage = 'Failed to create player';
    if (error instanceof Error) {
      if (error.name === 'ValidationError') {
        const validationError = error as any;
        const errors = Object.values(validationError.errors);
        if (errors.length > 0) {
          const firstError = errors[0] as any;
          if (firstError.path === 'age' && firstError.kind === 'max') {
            errorMessage = 'Age must be 45 or younger';
          } else if (firstError.path === 'age' && firstError.kind === 'min') {
            errorMessage = 'Age must be 16 or older';
          } else if (firstError.path === 'basePrice' && firstError.kind === 'min') {
            errorMessage = 'Base price must be a positive number';
          } else {
            errorMessage = firstError.message;
          }
        }
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

function calculatePlayerRating(player: any): number {
  let rating = 0;
  
  switch (player.role) {
    case 'batsman':
      rating = (player.battingStrikeRate / 10) + (player.runs / 1000);
      break;
    case 'bowler':
      rating = (player.wickets / 10) + (player.economy > 0 ? 50 / player.economy : 0);
      break;
    case 'all-rounder':
      rating = ((player.battingStrikeRate / 15) + (player.runs / 1500)) + 
               ((player.wickets / 15) + (player.economy > 0 ? 40 / player.economy : 0));
      break;
    case 'wicket-keeper':
      rating = (player.battingStrikeRate / 10) + (player.runs / 1000) + 10;
      break;
  }
  
  return Math.min(Math.max(rating, 0), 100);
}

function calculateSuggestedPrice(player: any): number {
  const rating = calculatePlayerRating(player);
  const baseMultiplier = rating / 50;
  const ageMultiplier = player.age < 25 ? 1.2 : player.age > 35 ? 0.8 : 1;
  const formMultiplier = {
    'excellent': 1.3,
    'good': 1.1,
    'average': 1,
    'poor': 0.7
  };
  
  return Math.round(
    player.basePrice * 
    baseMultiplier * 
    ageMultiplier * 
    (formMultiplier[player.recentForm as keyof typeof formMultiplier] ?? 1)
  )
};