import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Player from '@/models/Player';

// PATCH /api/players/[id]/status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const { status } = await request.json();

    // Validate status
    const validStatuses = ['available', 'sold', 'unsold', 'injured', 'retired'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
        { status: 400 }
      );
    }

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