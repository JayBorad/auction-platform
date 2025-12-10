import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Player from '@/models/Player';
import Team from '@/models/Team';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const role = searchParams.get('role') || '';

    // Build query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nationality: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (role && role !== 'all') {
      query.role = role;
    }

    const skip = (page - 1) * limit;

    // Get players with populated data
    const [players, totalCount] = await Promise.all([
      Player.find(query)
        .populate('team', 'name shortName')
        .sort({ basePrice: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Player.countDocuments(query)
    ]);

    // Transform player data for team-owner view
    const playersData = players.map((player: any) => ({
      _id: player._id,
      name: player.name,
      role: player.role,
      nationality: player.nationality,
      age: player.age,
      basePrice: player.basePrice,
      status: player.status,
      team: player.team ? {
        _id: player.team._id,
        name: player.team.name,
        shortName: player.team.shortName
      } : null,
      battingStyle: player.battingStyle,
      bowlingStyle: player.bowlingStyle,
      experience: player.experience,
      isActive: player.isActive,
      // Add market trend data (mock for now)
      marketTrend: {
        priceChange: (Math.random() - 0.5) * 30, // ±15% change
        demand: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
        recentActivity: Math.floor(Math.random() * 10) + 1 // 1-10 recent bids
      }
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: playersData,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch players' },
      { status: 500 }
    );
  }
} 