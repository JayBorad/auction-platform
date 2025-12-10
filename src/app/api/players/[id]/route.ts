import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Player from '@/models/Player';

// GET /api/players/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const player = await Player.findById(params.id).populate('team', 'name');
    
    if (!player) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      );
    }

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
    console.error('Error fetching player:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch player' },
      { status: 500 }
    );
  }
}

// PUT /api/players/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const body = await request.json();

    // Handle requeueing unsold players
    if (body.status === 'available' && body.action === 'requeue_unsold' && body.auctionId) {
      // First, get the current player to check auctionHistory
      const currentPlayer = await Player.findById(params.id);
      if (currentPlayer) {
        // Find the unsold auctionHistory entry for this auction
        const unsoldEntryIndex = currentPlayer.auctionHistory?.findIndex(
          (entry: any) => entry.auction?.toString() === body.auctionId && entry.status === 'unsold'
        );

        if (unsoldEntryIndex !== undefined && unsoldEntryIndex >= 0) {
          // Remove the auction history entry entirely for this auction
          currentPlayer.auctionHistory.splice(unsoldEntryIndex, 1);
          
          // Update the player's current status to available
          currentPlayer.status = 'available';
          
          await currentPlayer.save();
        }
      }
      // Skip the normal update since we handled it above
      return NextResponse.json({
        success: true,
        data: {
          player: {
            ...currentPlayer.toObject(),
            rating: calculatePlayerRating(currentPlayer.toObject()),
            suggestedPrice: calculateSuggestedPrice(currentPlayer.toObject())
          }
        }
      });
    }

    const player = await Player.findByIdAndUpdate(
      params.id,
      body,
      { new: true, runValidators: true }
    ).populate('team', 'name');

    if (!player) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      );
    }

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
    console.error('Error updating player:', error);

    // Handle Mongoose validation errors
    let errorMessage = 'Failed to update player';
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

// DELETE /api/players/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const player = await Player.findByIdAndDelete(params.id);

    if (!player) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Player deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting player:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete player' },
      { status: 500 }
    );
  }
}

// PATCH /api/players/[id]/status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const { status } = await request.json();

    const player = await Player.findByIdAndUpdate(
      params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!player) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { player }
    });

  } catch (error) {
    console.error('Error updating player status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update player status' },
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
    (formMultiplier[player.recentForm as keyof typeof formMultiplier] || 1)
  );
}