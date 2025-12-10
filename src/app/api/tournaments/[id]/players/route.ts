import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Tournament from '@/models/Tournament';
import Player from '@/models/Player';
import mongoose from 'mongoose';
import Auction from '@/models/Auction';

// GET /api/tournaments/[id]/players - Get players for a tournament
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    // Validate tournament ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tournament ID' },
        { status: 400 }
      );
    }

    // Get tournament with populated player data
    const tournament:any = await Tournament.findById(id)
      .populate({
        path: 'playerPool.availablePlayers.player',
        select: 'name role basePrice image nationality age battingHand bowlingHand'
      })
      .lean();
    
    if (!tournament) {
      return NextResponse.json(
        { success: false, error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Get all players (available players)
    const allPlayers = await Player.find({})
      .select('name role basePrice image nationality age battingHand bowlingHand')
      .lean();

    // Get player pool data (if any) - now with populated player data
    const playerPool = tournament.playerPool || {
      totalPlayers: 0,
      availablePlayers: [],
      soldPlayers: [],
      unsoldPlayers: []
    };

    // Calculate players available to add (not yet in tournament pool)
    const playersInPool = playerPool.availablePlayers?.map((p:any) => p.player?.toString()) || [];
    const availableToAdd = allPlayers.filter((player:any) => 
      !playersInPool.includes(player._id.toString())
    );

    return NextResponse.json({
      success: true,
      data: {
        tournament: {
          _id: tournament._id,
          name: tournament.name,
          format: tournament.format
        },
        playerPool,
        availablePlayers: allPlayers,
        availableToAdd: availableToAdd,
        stats: {
          totalAvailable: allPlayers.length,
          totalInPool: playerPool.totalPlayers,
          availableToAdd: availableToAdd.length,
          soldPlayers: playerPool.soldPlayers?.length || 0,
          unsoldPlayers: playerPool.unsoldPlayers?.length || 0,
          availableForAuction: playerPool.availablePlayers?.filter((p:any) => p.status === 'available')?.length || 0
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

// POST /api/tournaments/[id]/players - Add a player to tournament pool
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const { playerId, basePrice, category } = await request.json();

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(playerId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tournament or player ID' },
        { status: 400 }
      );
    }

    // Check if tournament exists
    const tournament:any = await Tournament.findById(id).lean();
    if (!tournament) {
      return NextResponse.json(
        { success: false, error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Check if player exists
    const player = await Player.findById(playerId);
    if (!player) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      );
    }

    // Check if player is already in the pool
    const playerPool = tournament.playerPool || { availablePlayers: [] };
    const isAlreadyInPool = playerPool.availablePlayers?.some(
      (p:any) => p.player?.toString() === playerId
    );

    if (isAlreadyInPool) {
      return NextResponse.json(
        { success: false, error: 'Player is already in the tournament pool' },
        { status: 400 }
      );
    }

    // Get the base price to use (from request or player's existing price)
    const playerBasePrice = basePrice || player.basePrice || 1000000; // Default 10 lakh
    const playerCategory = category || 'standard';

    // Update the player's basePrice in the Player model if a new basePrice was provided
    if (basePrice && basePrice !== player.basePrice) {
      await Player.updateOne(
        { _id: playerId },
        { 
          $set: { 
            basePrice: playerBasePrice,
            lastModified: new Date() 
          }
        }
      );
    }

    const newPlayerEntry = {
      player: new mongoose.Types.ObjectId(playerId),
      basePrice: playerBasePrice,
      category: playerCategory,
      addedDate: new Date(),
      status: 'available'
    };

    // Use direct MongoDB update to avoid schema validation issues
    await Tournament.updateOne(
      { _id: id },
      { 
        $push: { 'playerPool.availablePlayers': newPlayerEntry },
        $inc: { 'playerPool.totalPlayers': 1 },
        $set: { lastModified: new Date() }
      }
    );

    // Also add player to auction queue
    try {
      const auction = await Auction.findOne({ tournament: id });
      if (auction) {
        await Auction.updateOne(
          { _id: auction._id },
          { 
            $push: { playerQueue: new mongoose.Types.ObjectId(playerId) },
            $inc: { totalPlayers: 1 },
            $set: { lastModified: new Date() }
          }
        );
      }
    } catch (auctionError) {
      console.error('Error adding player to auction queue:', auctionError);
      // Don't fail the tournament addition if auction update fails
    }

    // Get updated data
    const updatedTournament:any = await Tournament.findById(id).lean();
    const allPlayers = await Player.find({}).select('name role basePrice image nationality').lean();

    return NextResponse.json({
      success: true,
      data: {
        tournament: updatedTournament,
        playerPool: updatedTournament.playerPool,
        availablePlayers: allPlayers
      },
      message: 'Player added to tournament pool successfully'
    });

  } catch (error) {
    console.error('Error adding player to tournament:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add player to tournament' },
      { status: 500 }
    );
  }
}

// PATCH /api/tournaments/[id]/players - Bulk add all players to tournament pool
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const { action } = await request.json();

    // Only allow 'add-all' action
    if (action !== 'add-all') {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Validate tournament ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tournament ID' },
        { status: 400 }
      );
    }

    // Check if tournament exists
    const tournament:any = await Tournament.findById(id).lean();
    if (!tournament) {
      return NextResponse.json(
        { success: false, error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Get all players
    const allPlayers = await Player.find({}).lean();
    
    // Get players already in the pool
    const playerPool = tournament.playerPool || { availablePlayers: [] };
    const playersInPool = playerPool.availablePlayers?.map((p:any) => p.player?.toString()) || [];
    
    // Filter out players already in the pool
    const playersToAdd = allPlayers.filter((player:any) => 
      !playersInPool.includes(player._id.toString())
    );

    if (playersToAdd.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All players are already in the tournament pool',
        data: {
          added: 0,
          skipped: allPlayers.length
        }
      });
    }

    // Prepare player entries
    const newPlayerEntries = playersToAdd.map((player:any) => ({
      player: new mongoose.Types.ObjectId(player._id),
      basePrice: player.basePrice || 1000000, // Default 10 lakh
      category: 'standard', // Default category
      addedDate: new Date(),
      status: 'available'
    }));

    // Bulk add all players
    await Tournament.updateOne(
      { _id: id },
      { 
        $push: { 
          'playerPool.availablePlayers': { $each: newPlayerEntries }
        },
        $inc: { 'playerPool.totalPlayers': newPlayerEntries.length },
        $set: { lastModified: new Date() }
      }
    );

    // Also add players to auction queue if auction exists
    try {
      const auction = await Auction.findOne({ tournament: id });
      if (auction) {
        const playerIds = playersToAdd.map((p:any) => new mongoose.Types.ObjectId(p._id));
        await Auction.updateOne(
          { _id: auction._id },
          { 
            $push: { 
              playerQueue: { $each: playerIds }
            },
            $inc: { totalPlayers: playerIds.length },
            $set: { lastModified: new Date() }
          }
        );
      }
    } catch (auctionError) {
      console.error('Error adding players to auction queue:', auctionError);
      // Don't fail the tournament addition if auction update fails
    }

    // Get updated tournament data
    const updatedTournament:any = await Tournament.findById(id).lean();

    return NextResponse.json({
      success: true,
      message: `Successfully added ${newPlayerEntries.length} player(s) to tournament pool`,
      data: {
        added: newPlayerEntries.length,
        skipped: playersInPool.length,
        total: allPlayers.length
      }
    });

  } catch (error) {
    console.error('Error bulk adding players to tournament:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add players to tournament' },
      { status: 500 }
    );
  }
}

// DELETE /api/tournaments/[id]/players - Remove a player from tournament pool
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const { playerId } = await request.json();

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(playerId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tournament or player ID' },
        { status: 400 }
      );
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return NextResponse.json(
        { success: false, error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Remove player using direct MongoDB update
    await Tournament.updateOne(
      { _id: id },
      { 
        $pull: { 'playerPool.availablePlayers': { player: new mongoose.Types.ObjectId(playerId) } },
        $inc: { 'playerPool.totalPlayers': -1 },
        $set: { lastModified: new Date() }
      }
    );

    // Also remove player from auction queue
    try {
      const auction = await Auction.findOne({ tournament: id });
      if (auction) {
        await Auction.updateOne(
          { _id: auction._id },
          { 
            $pull: { playerQueue: new mongoose.Types.ObjectId(playerId) },
            $inc: { totalPlayers: -1 },
            $set: { lastModified: new Date() }
          }
        );
      }
    } catch (auctionError) {
      console.error('Error removing player from auction queue:', auctionError);
      // Don't fail the tournament removal if auction update fails
    }

    return NextResponse.json({
      success: true,
      message: 'Player removed from tournament pool successfully'
    });

  } catch (error) {
    console.error('Error removing player from tournament:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove player from tournament' },
      { status: 500 }
    );
  }
} 