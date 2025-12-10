import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import Auction from "@/models/Auction";
import Player from "@/models/Player";
import Bid from "@/models/Bid";
import Team from "@/models/Team";

interface Params {
  params: {
    id: string;
  };
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const { action, playerId } = body;

    const auction = await Auction.findById(id);
    if (!auction) {
      return NextResponse.json(
        { success: false, error: "Auction not found" },
        { status: 404 }
      );
    }

    switch (action) {
      case "start":
        return await startAuction(auction, request);

      case "pause":
        return await pauseAuction(auction, request);

      case "resume":
        return await resumeAuction(auction, request);

      case "stop":
        return await stopAuction(auction, request);

      case "next-player":
        return await setNextPlayer(auction, request);

      case "set-player":
        return await setCurrentPlayer(auction, playerId);
      case "set-current-player": // alias used by frontend
        return await setCurrentPlayer(auction, playerId);

      case "skip-player":
        return await skipCurrentPlayer(auction, request);

      case "shuffle":
        return await shuffleQueue(auction);

      case "reset":
        return await resetAuction(auction);

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error controlling auction:", error);
    return NextResponse.json(
      { success: false, error: "Failed to control auction" },
      { status: 500 }
    );
  }
}

// Build a fully populated auction response (admin UI expects rich data)
async function buildPopulatedAuctionResponse(auctionDoc: any) {
  const auction = auctionDoc;

  // Start from a plain object to freely attach fields
  const populatedAuction: any = auction.toObject
    ? auction.toObject()
    : { ...auction };

  // Populate tournament
  if (auction.tournament) {
    const tournament = await mongoose
      .model("Tournament")
      .findById(auction.tournament)
      .select("name description")
      .lean();
    populatedAuction.tournament = tournament;
  }

  // Populate current player
  if (auction.currentPlayer) {
    const currentPlayer = await mongoose
      .model("Player")
      .findById(auction.currentPlayer)
      .select("name role basePrice image stats battingHand bowlingHand")
      .lean();
    populatedAuction.currentPlayer = currentPlayer;
  }

  // Populate current bid -> team
  if (auction.currentBid && auction.currentBid.bidder) {
    const bidderTeam: any = await mongoose
      .model("Team")
      .findById(auction.currentBid.bidder)
      .select("name logo")
      .lean();
    populatedAuction.currentBid = {
      amount: auction.currentBid.amount,
      team: bidderTeam
        ? {
            _id: bidderTeam._id,
            name: bidderTeam.name,
            logo: bidderTeam.logo,
            // best-effort remainingBudget lookup
            remainingBudget:
              auction.participants?.find(
                (p: any) => p?.team?.toString?.() === bidderTeam._id.toString()
              )?.remainingBudget || 0,
          }
        : null,
    } as any;
  }

  // Populate participants teams and playersWon
  if (auction.participants && auction.participants.length > 0) {
    populatedAuction.participants = await Promise.all(
      auction.participants.map(async (p: any) => {
        const team = p.team
          ? await mongoose
              .model("Team")
              .findById(p.team)
              .select("name logo")
              .lean()
          : null;
        let playersWon: any[] = [];
        if (p.playersWon && p.playersWon.length > 0) {
          playersWon = await mongoose
            .model("Player")
            .find({ _id: { $in: p.playersWon } })
            .select("name role basePrice soldPrice image")
            .lean();
        }
        return {
          team,
          remainingBudget: p.remainingBudget,
          playersWon,
        };
      })
    );
  }

  // Populate playerQueue to player objects
  if (auction.playerQueue && auction.playerQueue.length > 0) {
    const playerQueue = await mongoose
      .model("Player")
      .find({ _id: { $in: auction.playerQueue } })
      .select("name role basePrice image")
      .lean();
    // Preserve incoming order
    const orderMap = new Map(
      auction.playerQueue.map((id: any, idx: number) => [id.toString(), idx])
    );
    populatedAuction.playerQueue = playerQueue
      .slice()
      .sort((a: any, b: any) => {
        const ai = orderMap.get(a._id.toString());
        const bi = orderMap.get(b._id.toString());
        const aIdx: number = typeof ai === "number" ? ai : 0;
        const bIdx: number = typeof bi === "number" ? bi : 0;
        return aIdx - bIdx;
      });
  }

  return populatedAuction;
}

async function startAuction(auction: any, request: NextRequest) {
  if (auction.status !== "upcoming") {
    return NextResponse.json(
      { success: false, error: "Can only start upcoming auctions" },
      { status: 400 }
    );
  }

  // Check if there are players in the queue
  if (auction.playerQueue.length === 0) {
    return NextResponse.json(
      { success: false, error: "No players in auction queue" },
      { status: 400 }
    );
  }

  // Set first player as current player
  const firstPlayerId = auction.playerQueue[0];
  const firstPlayer = await Player.findById(firstPlayerId);

  if (!firstPlayer) {
    return NextResponse.json(
      { success: false, error: "First player not found" },
      { status: 400 }
    );
  }

  auction.status = "live";
  auction.currentPlayer = firstPlayerId;
  auction.currentBid = {
    amount: firstPlayer.basePrice,
    bidder: null,
    bidderName: "Starting Price",
  };

  await auction.save();
  
  // Send WebSocket event
  try {
    await fetch(`${request.nextUrl.origin}/api/websocket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'auction_started',
        data: { auctionId: auction._id.toString() }
      })
    });
  } catch (error) {
    console.error('Failed to send WebSocket event:', error);
  }

  const populatedAuction = await buildPopulatedAuctionResponse(auction);

  return NextResponse.json({
    success: true,
    data: populatedAuction,
    message: "Auction started successfully",
  });
}

async function pauseAuction(auction: any, request: NextRequest) {
  if (auction.status !== "live") {
    return NextResponse.json(
      { success: false, error: "Can only pause live auctions" },
      { status: 400 }
    );
  }

  auction.status = "paused";
  await auction.save();

  // Emit WebSocket event for real-time updates
  // Send WebSocket event
  try {
    await fetch(`${request.nextUrl.origin}/api/websocket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'auction_paused',
        data: { auctionId: auction._id.toString() }
      })
    });
  } catch (error) {
    console.error('Failed to send WebSocket event:', error);
  }

  const populatedAuction = await buildPopulatedAuctionResponse(auction);

  return NextResponse.json({
    success: true,
    data: populatedAuction,
    message: "Auction paused successfully",
  });
}

async function resumeAuction(auction: any, request: NextRequest) {
  if (auction.status !== "paused") {
    return NextResponse.json(
      { success: false, error: "Can only resume paused auctions" },
      { status: 400 }
    );
  }

  auction.status = "live";
  await auction.save();
  // Emit WebSocket event for real-time updates
  // Send WebSocket event
  try {
    await fetch(`${request.nextUrl.origin}/api/websocket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'auction_resumed',
        data: { auctionId: auction._id.toString() }
      })
    });
  } catch (error) {
    console.error('Failed to send WebSocket event:', error);
  }

  const populatedAuction = await buildPopulatedAuctionResponse(auction);

  return NextResponse.json({
    success: true,
    data: populatedAuction,
    message: "Auction resumed successfully",
  });
}

async function stopAuction(auction: any, request: NextRequest) {
  if (!["live", "paused"].includes(auction.status)) {
    return NextResponse.json(
      { success: false, error: "Can only stop live or paused auctions" },
      { status: 400 }
    );
  }

  auction.status = "completed";
  auction.currentPlayer = null;
  auction.currentBid = {
    amount: 0,
    bidder: null,
    bidderName: "",
  };

  await auction.save();
  
  // Send WebSocket event
  try {
    await fetch(`${request.nextUrl.origin}/api/websocket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'auction_ended',
        data: { auctionId: auction._id.toString() }
      })
    });
  } catch (error) {
    console.error('Failed to send WebSocket event:', error);
  }
  
  const populatedAuction = await buildPopulatedAuctionResponse(auction);

  return NextResponse.json({
    success: true,
    data: populatedAuction,
    message: "Auction stopped successfully",
  });
}

async function setNextPlayer(auction: any, request: NextRequest) {
  if (auction.status !== "live") {
    return NextResponse.json(
      { success: false, error: "Auction must be live to set next player" },
      { status: 400 }
    );
  }

  // Handle current player if exists
  if (auction.currentPlayer) {
    const currentPlayerBid = await (Bid as any).getHighestBid(
      auction._id,
      auction.currentPlayer
    );

    if (currentPlayerBid && currentPlayerBid.status === "active") {
      // Player was sold
      await currentPlayerBid.markAsWon();
      await Player.findByIdAndUpdate(auction.currentPlayer, {
        // status: "sold",
        soldPrice: currentPlayerBid.amount,
        team: currentPlayerBid.bidder,
        $push: {
          auctionHistory: {
            auction: auction._id,
            finalPrice: currentPlayerBid.amount,
            winner: currentPlayerBid.bidder,
            status: "sold",
            year: new Date().getFullYear(),
          },
        },
      });

      // Update auction stats
      auction.soldPlayers += 1;

      // Update participant data
      const participantIndex = auction.participants.findIndex(
        (p: any) => p.team.toString() === currentPlayerBid.bidder.toString()
      );

      if (participantIndex !== -1) {
        auction.participants[participantIndex].remainingBudget -=
          currentPlayerBid.amount;
        auction.participants[participantIndex].playersWon.push(
          auction.currentPlayer
        );
      }
      
      // Emit player_sold event with player and team details
      const soldPlayer: any = await Player.findById(auction.currentPlayer).select('name role image').lean();
      const winningTeam: any = await Team.findById(currentPlayerBid.bidder).select('name logo').lean();
      
      (process as NodeJS.EventEmitter).emit('player_sold', {
        auctionId: auction._id.toString(),
        player: {
          _id: soldPlayer?._id,
          name: soldPlayer?.name,
          role: soldPlayer?.role,
          image: soldPlayer?.image
        },
        team: {
          _id: winningTeam?._id,
          name: winningTeam?.name,
          logo: winningTeam?.logo
        },
        amount: currentPlayerBid.amount
      });
    } else {
      // Player was unsold
      await Player.findByIdAndUpdate(auction.currentPlayer, {
        // status: "unsold",
        $push: {
          auctionHistory: {
            auction: auction._id,
            finalPrice: null,
            winner: null,
            status: "unsold",
            year: new Date().getFullYear(),
          },
        },
      });
      auction.unsoldPlayers += 1;
    }

    // Remove current player from queue
    auction.playerQueue = auction.playerQueue.filter(
      (playerId: any) =>
        playerId.toString() !== auction.currentPlayer.toString()
    );
  }

  // Normalize queue to raw ids
  const queueIds: string[] = auction.playerQueue.map((p: any) =>
    p?._id?.toString ? p._id.toString() : p.toString()
  );

  // Set next player
  if (queueIds.length > 0) {
    const nextPlayerId = queueIds[0];
    const nextPlayer = await Player.findById(nextPlayerId);

    if (!nextPlayer) {
      return NextResponse.json(
        { success: false, error: "Next player not found" },
        { status: 400 }
      );
    }

    auction.currentPlayer = nextPlayerId;
    auction.currentBid = {
      amount: nextPlayer.basePrice,
      bidder: null,
      bidderName: "Starting Price",
    };
  } else {
    // No more players, end auction
    auction.status = "live";
    auction.currentPlayer = null;
    auction.currentBid = {
      amount: 0,
      bidder: null,
      bidderName: "",
    };
  }

  await auction.save();
  
  if (auction.status === "completed") {
    // Send WebSocket event
  try {
    await fetch(`${request.nextUrl.origin}/api/websocket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'auction_ended',
        data: { auctionId: auction._id.toString() }
      })
    });
  } catch (error) {
    console.error('Failed to send WebSocket event:', error);
  }
  } else {
    (process as NodeJS.EventEmitter).emit('player_changed', { auctionId: auction._id.toString() });
  }
  
  const populatedAuction = await buildPopulatedAuctionResponse(auction);

  return NextResponse.json({
    success: true,
    data: populatedAuction,
    message:
      auction.status === "completed"
        ? "Auction completed"
        : "Next player set successfully",
  });
}

async function setCurrentPlayer(auction: any, playerId: string) {
  if (auction.status !== "live") {
    return NextResponse.json(
      { success: false, error: "Auction must be live to set current player" },
      { status: 400 }
    );
  }

  if (!playerId) {
    return NextResponse.json(
      { success: false, error: "Player ID is required" },
      { status: 400 }
    );
  }

  const player = await Player.findById(playerId);
  if (!player) {
    return NextResponse.json(
      { success: false, error: "Player not found" },
      { status: 404 }
    );
  }

  const queueIds: string[] = auction.playerQueue.map((p: any) =>
    p?._id?.toString ? p._id.toString() : p.toString()
  );
  if (!queueIds.includes(playerId.toString())) {
    return NextResponse.json(
      { success: false, error: "Player not in auction queue" },
      { status: 400 }
    );
  }

  auction.currentPlayer = playerId;
  auction.currentBid = {
    amount: player.basePrice,
    bidder: null,
    bidderName: "Starting Price",
  };

  await auction.save();
  
  (process as NodeJS.EventEmitter).emit('player_changed', { auctionId: auction._id.toString() });
  
  const populatedAuction = await buildPopulatedAuctionResponse(auction);

  return NextResponse.json({
    success: true,
    data: populatedAuction,
    message: "Current player set successfully",
  });
}

async function shuffleQueue(auction: any) {
  if (!["upcoming", "live", "paused"].includes(auction.status)) {
    return NextResponse.json(
      { success: false, error: "Cannot shuffle queue for this auction status" },
      { status: 400 }
    );
  }

  const currentId = auction.currentPlayer
    ? auction.currentPlayer.toString()
    : null;
  const queueIds = auction.playerQueue.map((id: any) =>
    id?._id?.toString ? id._id.toString() : id.toString()
  );

  // Exclude current player from shuffle if present in queue
  const remaining = queueIds.filter((id: string) => id !== currentId);

  // Fisher-Yates shuffle
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }

  const newQueue = (currentId ? [currentId, ...remaining] : remaining).map(
    (id: string) => new (require("mongoose").Types.ObjectId)(id)
  );

  auction.playerQueue = newQueue as any;
  await auction.save();
  const populatedAuction = await buildPopulatedAuctionResponse(auction);

  return NextResponse.json({
    success: true,
    data: populatedAuction,
    message: "Player queue shuffled successfully",
  });
}

async function skipCurrentPlayer(auction: any, request: NextRequest) {
  if (auction.status !== "live") {
    return NextResponse.json(
      { success: false, error: "Auction must be live to skip player" },
      { status: 400 }
    );
  }

  if (!auction.currentPlayer) {
    return NextResponse.json(
      { success: false, error: "No current player to skip" },
      { status: 400 }
    );
  }

  // Mark current player as unsold
  await Player.findByIdAndUpdate(auction.currentPlayer, {
    // status: "unsold",
    $push: {
      auctionHistory: {
        auction: auction._id,
        finalPrice: null,
        winner: null,
        status: "unsold",
        year: new Date().getFullYear(),
      },
    },
  });

  auction.unsoldPlayers += 1;

  // Remove from queue and set next player
  return await setNextPlayer(auction, request);
}

async function resetAuction(auction: any) {
  if (auction.status === "live") {
    return NextResponse.json(
      { success: false, error: "Cannot reset live auction" },
      { status: 400 }
    );
  }

  // Reset auction state
  auction.status = "upcoming";
  auction.currentPlayer = null;
  auction.currentBid = {
    amount: 0,
    bidder: null,
    bidderName: "",
  };
  auction.soldPlayers = 0;
  auction.unsoldPlayers = 0;

  // Reset all players in the auction to available status
  if (auction.playerQueue.length > 0) {
    await Player.updateMany(
      { _id: { $in: auction.playerQueue } },
      {
        status: "available",
        soldPrice: null,
        team: null,
      }
    );
  }

  // Reset participant budgets
  auction.participants.forEach((participant: any) => {
    participant.remainingBudget = auction.totalBudget;
    participant.playersWon = [];
  });

  // Delete all bids for this auction
  await Bid.deleteMany({ auction: auction._id });

  await auction.save();
  const populatedAuction = await buildPopulatedAuctionResponse(auction);

  return NextResponse.json({
    success: true,
    data: populatedAuction,
    message: "Auction reset successfully",
  });
}
