import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import connectDB from '@/lib/db';
import Bid from '@/models/Bid';
import Auction from '@/models/Auction';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const auctionId = params.id;
    const { searchParams } = new URL(request.url);
    const since = parseInt(searchParams.get('since') || '0');
    const sinceDate = new Date(since);

    // Get recent bids for this auction since the timestamp
    const bids = await Bid.find({
      auction: auctionId,
      createdAt: { $gt: sinceDate }
    })
    .sort({ createdAt: 1 })
    .populate('player', 'name role')
    .populate('bidder', 'name')
    .lean();

    // Get auction status changes by checking updatedAt field
    // For now, we'll just return bid updates since auction_logs collection doesn't exist
    const auction = await Auction.findById(auctionId).lean() as any;
    const statusUpdates = [];

    // If auction was updated recently, add a status update
    if (auction && auction.updatedAt && new Date(auction.updatedAt) > sinceDate) {
      statusUpdates.push({
        auctionId,
        type: 'auction_updated' as const,
        data: {
          status: (auction as any).status || 'unknown',
          currentPlayer: (auction as any).currentPlayer || null,
          updatedAt: auction.updatedAt
        },
        timestamp: new Date(auction.updatedAt).getTime()
      });
    }

    // Convert bids to auction updates format
    const bidUpdates = bids.map(bid => ({
      auctionId,
      type: 'bid_placed' as const,
      data: {
        playerId: bid.player._id || bid.player,
        playerName: bid.player.name,
        amount: bid.amount,
        teamId: bid.bidder._id || bid.bidder,
        teamName: bid.bidder.name,
        bidder: bid.bidder._id || bid.bidder,
        bidType: bid.bidType,
        timestamp: bid.timestamp
      },
      timestamp: bid.createdAt.getTime()
    }));

    // Combine and sort all updates
    const allUpdates = [...bidUpdates, ...statusUpdates]
      .sort((a, b) => a.timestamp - b.timestamp);

    return NextResponse.json(allUpdates);

  } catch (error) {
    console.error('Error fetching auction updates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
