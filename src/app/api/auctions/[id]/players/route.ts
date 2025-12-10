import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Auction from '@/models/Auction';
import Player from '@/models/Player';

interface Params {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    await connectDB();

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    const auction = await Auction.findById(id);
    if (!auction) {
      return NextResponse.json(
        { success: false, error: 'Auction not found' },
        { status: 404 }
      );
    }

    // Build query for players in auction queue
    const query: any = {
      _id: { $in: auction.playerQueue }
    };

    if (status !== 'all') {
      query.status = status;
    }

    if (role) {
      query.role = role;
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const players = await Player.find(query)
      .populate('team', 'name')
      .sort({ basePrice: -1 });

    // Get available players not in auction
    const availablePlayersQuery: any = {
      _id: { $nin: auction.playerQueue },
      status: 'available'
    };

    if (role) {
      availablePlayersQuery.role = role;
    }

    if (search) {
      availablePlayersQuery.name = { $regex: search, $options: 'i' };
    }

    const availablePlayers = await Player.find(availablePlayersQuery)
      .limit(50)
      .sort({ basePrice: -1 });

    // Unsold players for this auction (from auctionHistory) - exclude requeued entries
    const unsoldPlayersForAuction = await Player.find({
      auctionHistory: {
        $elemMatch: { 
          auction: auction._id, 
          status: 'unsold',
          $or: [
            { requeuedAt: { $exists: false } },
            { requeuedAt: null }
          ]
        }
      }
    }).select('name role basePrice image');

    // Calculate statistics
    const stats = {
      totalInQueue: auction.playerQueue.length,
      totalAvailable: await Player.countDocuments({ status: 'available' }),
      byRole: await Player.aggregate([
        { $match: { _id: { $in: auction.playerQueue } } },
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      totalValue: players.reduce((sum, player) => sum + player.basePrice, 0),
      averagePrice: players.length > 0 ? 
        players.reduce((sum, player) => sum + player.basePrice, 0) / players.length : 0
    };

    return NextResponse.json({
      success: true,
      data: {
        queuedPlayers: players,
        availablePlayers,
        stats,
        unsoldPlayersForAuction
      }
    });

  } catch (error) {
    console.error('Error fetching auction players:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch auction players' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await connectDB();

    const { id } = params;
    const body = await request.json();
    const { playerIds, action = 'add' } = body;

    if (!Array.isArray(playerIds) || playerIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Player IDs array is required' },
        { status: 400 }
      );
    }

    const auction = await Auction.findById(id);
    if (!auction) {
      return NextResponse.json(
        { success: false, error: 'Auction not found' },
        { status: 404 }
      );
    }

    // Check if auction allows modifications
    if (auction.status === 'live') {
      return NextResponse.json(
        { success: false, error: 'Cannot modify player queue during live auction' },
        { status: 400 }
      );
    }

    if (auction.status === 'completed') {
      return NextResponse.json(
        { success: false, error: 'Cannot modify completed auction' },
        { status: 400 }
      );
    }

    // Validate all players exist and are available
    const players = await Player.find({
      _id: { $in: playerIds },
      status: action === 'add' ? 'available' : { $in: ['available', 'sold', 'unsold'] }
    });

    if (players.length !== playerIds.length) {
      return NextResponse.json(
        { success: false, error: 'Some players not found or not available' },
        { status: 400 }
      );
    }

    let updatedAuction;
    let message;

    if (action === 'add') {
      // Add players to queue (avoid duplicates)
      const newPlayerIds = playerIds.filter(
        playerId => !auction.playerQueue.includes(playerId)
      );

      if (newPlayerIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'All players are already in the auction queue' },
          { status: 400 }
        );
      }

      updatedAuction = await Auction.findByIdAndUpdate(
        id,
        { 
          $push: { playerQueue: { $each: newPlayerIds } },
          $inc: { totalPlayers: newPlayerIds.length }
        },
        { new: true }
      );

      message = `${newPlayerIds.length} player(s) added to auction queue`;

    } else if (action === 'remove') {
      // Remove players from queue
      const playersToRemove = playerIds.filter(
        playerId => auction.playerQueue.includes(playerId)
      );

      if (playersToRemove.length === 0) {
        return NextResponse.json(
          { success: false, error: 'None of the specified players are in the auction queue' },
          { status: 400 }
        );
      }

      updatedAuction = await Auction.findByIdAndUpdate(
        id,
        { 
          $pull: { playerQueue: { $in: playersToRemove } },
          $inc: { totalPlayers: -playersToRemove.length }
        },
        { new: true }
      );

      // Reset player status if they were in auction
      await Player.updateMany(
        { _id: { $in: playersToRemove } },
        { status: 'available', soldPrice: null, team: null }
      );

      message = `${playersToRemove.length} player(s) removed from auction queue`;

    } else if (action === 'reorder') {
      // Reorder players in queue
      const validPlayerIds = playerIds.filter(
        playerId => auction.playerQueue.includes(playerId)
      );

      if (validPlayerIds.length !== auction.playerQueue.length) {
        return NextResponse.json(
          { success: false, error: 'Player list must contain all current queue players' },
          { status: 400 }
        );
      }

      updatedAuction = await Auction.findByIdAndUpdate(
        id,
        { playerQueue: validPlayerIds },
        { new: true }
      );

      message = 'Player queue reordered successfully';

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be add, remove, or reorder' },
        { status: 400 }
      );
    }

    // Populate the updated auction
    await updatedAuction.populate('playerQueue', 'name role basePrice image');

    return NextResponse.json({
      success: true,
      data: updatedAuction,
      message
    });

  } catch (error) {
    console.error('Error managing auction players:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to manage auction players' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await connectDB();

    const { id } = params;
    const body = await request.json();
    const { sortBy = 'basePrice', sortOrder = 'desc', filters = {} } = body;

    const auction = await Auction.findById(id);
    if (!auction) {
      return NextResponse.json(
        { success: false, error: 'Auction not found' },
        { status: 404 }
      );
    }

    if (auction.status === 'live') {
      return NextResponse.json(
        { success: false, error: 'Cannot reorder players during live auction' },
        { status: 400 }
      );
    }

    // Build sort criteria
    const sortCriteria: any = {};
    sortCriteria[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Build filter criteria
    const filterCriteria: any = {
      _id: { $in: auction.playerQueue }
    };

    if (filters.role) {
      filterCriteria.role = filters.role;
    }

    if (filters.minPrice) {
      filterCriteria.basePrice = { $gte: filters.minPrice };
    }

    if (filters.maxPrice) {
      filterCriteria.basePrice = { 
        ...filterCriteria.basePrice, 
        $lte: filters.maxPrice 
      };
    }

    // Get sorted players
    const sortedPlayers = await Player.find(filterCriteria)
      .sort(sortCriteria)
      .select('_id');

    const sortedPlayerIds = sortedPlayers.map(player => player._id.toString());

    // Add any players not matching filters to the end
    const filteredPlayerIds = auction.playerQueue.filter(
      (playerId: string | { toString(): string }) =>
        !sortedPlayerIds.includes(
          typeof playerId === 'string' ? playerId : playerId.toString()
        )
    );

    const newQueue = [...sortedPlayerIds, ...filteredPlayerIds];

    // Update auction with new order
    const updatedAuction = await Auction.findByIdAndUpdate(
      id,
      { playerQueue: newQueue },
      { new: true }
    ).populate('playerQueue', 'name role basePrice image');

    return NextResponse.json({
      success: true,
      data: updatedAuction,
      message: 'Player queue sorted successfully'
    });

  } catch (error) {
    console.error('Error sorting auction players:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sort auction players' },
      { status: 500 }
    );
  }
} 