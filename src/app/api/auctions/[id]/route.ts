import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import Auction from "@/models/Auction";
import Player from "@/models/Player";
import Bid from "@/models/Bid";
import Tournament from "@/models/Tournament";

interface Params {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    await connectDB();

    const { id } = await params;

    // First, try to get the auction without any population
    const auction = await Auction.findById(id);

    if (!auction) {
      return NextResponse.json(
        { success: false, error: "Auction not found" },
        { status: 404 }
      );
    }

    // Manually populate the fields we need
    let populatedAuction = auction.toObject();

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
        .select("name role basePrice image battingHand bowlingHand")
        .lean();
      populatedAuction.currentPlayer = currentPlayer;
    }

    // Populate current bid bidder
    if (auction.currentBid && auction.currentBid.bidder) {
      const bidderTeam:any = await mongoose
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
            }
          : null,
      } as any;
    }

    // Populate participants teams
    if (auction.participants && auction.participants.length > 0) {
      for (let i = 0; i < populatedAuction.participants.length; i++) {
        const participant = populatedAuction.participants[i];
        if (participant.team) {
          const team = await mongoose
            .model("Team")
            .findById(participant.team)
            .select("name logo")
            .lean();
          populatedAuction.participants[i].team = team;
        }

        // Populate players won
        if (participant.playersWon && participant.playersWon.length > 0) {
          const playersWon = await mongoose
            .model("Player")
            .find({
              _id: { $in: participant.playersWon },
            })
            .select("name role basePrice soldPrice image")
            .lean();
          populatedAuction.participants[i].playersWon = playersWon;
        }
      }
    }

    // Populate player queue
    if (auction.playerQueue && auction.playerQueue.length > 0) {
      const playerQueue = await mongoose
        .model("Player")
        .find({
          _id: { $in: auction.playerQueue },
        })
        .select("name role basePrice image")
        .lean();
      populatedAuction.playerQueue = playerQueue;
    }

    // Get recent bids safely
    let recentBids:any = [];
    let currentPlayerBids:any = [];

    try {
      // Simple bid query without using static methods
      const bids = await mongoose
        .model("Bid")
        .find({ auction: id })
        .sort({ timestamp: -1 })
        .limit(20)
        .populate("player", "name role")
        .populate("bidder", "name")
        .lean();
      recentBids = bids || [];

      // Get current player bids if there's a current player
      if (auction.currentPlayer) {
        const playerBids = await mongoose
          .model("Bid")
          .find({
            auction: id,
            player: auction.currentPlayer,
          })
          .sort({ timestamp: -1 })
          .populate("bidder", "name")
          .lean();
        currentPlayerBids = playerBids || [];
      }
    } catch (error) {
      console.error("Error fetching bids:", error);
      recentBids = [];
      currentPlayerBids = [];
    }

    // Calculate statistics
    const auctionStats = {
      totalRevenue:
        populatedAuction.participants?.reduce((sum:any, participant:any) => {
          return (
            sum +
            (populatedAuction.totalBudget -
              (participant.remainingBudget || populatedAuction.totalBudget))
          );
        }, 0) || 0,
      averagePlayerPrice:
        populatedAuction.soldPlayers > 0
          ? (populatedAuction.participants?.reduce((sum:any, participant:any) => {
              return (
                sum +
                (populatedAuction.totalBudget -
                  (participant.remainingBudget || populatedAuction.totalBudget))
              );
            }, 0) || 0) / populatedAuction.soldPlayers
          : 0,
      highestSale:
        recentBids.length > 0
          ? Math.max(...recentBids.map((b:any) => b.amount))
          : 0,
      participantStats:
        populatedAuction.participants?.map((participant:any) => ({
          team: participant.team,
          spent:
            populatedAuction.totalBudget -
            (participant.remainingBudget || populatedAuction.totalBudget),
          playersCount: participant.playersWon?.length || 0,
          averagePlayerPrice:
            (participant.playersWon?.length || 0) > 0
              ? (populatedAuction.totalBudget -
                  (participant.remainingBudget ||
                    populatedAuction.totalBudget)) /
                (participant.playersWon?.length || 1)
              : 0,
        })) || [],
    };

    populatedAuction.totalPlayers = populatedAuction.soldPlayers + populatedAuction.unsoldPlayers + (populatedAuction.playerQueue?.length || 0);

    return NextResponse.json({
      success: true,
      data: {
        auction: populatedAuction,
        recentBids,
        currentPlayerBids,
        stats: auctionStats,
      },
    });
  } catch (error) {
    console.error("Error fetching auction:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch auction" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await connectDB();

    const { id } = params;
    console.log("id", id);
    const body = await request.json();

    const auction = await Auction.findById(id);
    if (!auction) {
      return NextResponse.json(
        { success: false, error: "Auction not found" },
        { status: 404 }
      );
    }

    if (["live", "completed"].includes(auction.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot update ${auction.status} auction` },
        { status: 400 }
      );
    }

    // Update allowed fields
    const allowedUpdates = [
      "name",
      "startDate",
      "endDate",
      "totalBudget",
      "participants",
      "rules",
      "playerQueue",
    ];

    const updates: Record<string, any> = {};
    for (const field of allowedUpdates) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Validate dates if provided
    if (updates.startDate || updates.endDate) {
      const startDate = new Date(updates.startDate || auction.startDate);
      const endDate = new Date(updates.endDate || auction.endDate);

      if (startDate >= endDate) {
        return NextResponse.json(
          { success: false, error: "Start date must be before end date" },
          { status: 400 }
        );
      }
    }

     await Auction.findByIdAndUpdate(
      id,
      { $set: updates },
      { runValidators: true }
    );

    // If playerQueue was updated, also update the tournament's player pool
    if (updates.playerQueue) {
      try {
        const tournament = await Tournament.findById(auction.tournament);
        if (tournament) {
          // Get the current player pool from the tournament
          const currentPlayerPool = tournament.playerPool?.availablePlayers || [];
          const currentPlayerIds = currentPlayerPool.map((p: any) => p.player?.toString());

          // Get the new player queue from the auction
          const updatedAuction = await Auction.findById(id);
          const newPlayerQueue = updatedAuction?.playerQueue || [];

          // Find players that were added to the queue
          const addedPlayerIds = newPlayerQueue.filter(
            (playerId: any) => !currentPlayerIds.includes(playerId.toString())
          );

          // Find players that were removed from the queue
          const removedPlayerIds = currentPlayerIds.filter(
            (playerId: string) => !newPlayerQueue.some((p: any) => p.toString() === playerId)
          );

          // Add new players to tournament's player pool
          if (addedPlayerIds.length > 0) {
            const playersToAdd = await Player.find({
              _id: { $in: addedPlayerIds },
              status: 'available'
            });

            for (const player of playersToAdd) {
              const playerEntry = {
                player: player._id,
                basePrice: player.basePrice || 1000000,
                category: 'standard',
                addedDate: new Date(),
                status: 'available'
              };

              await Tournament.updateOne(
                { _id: tournament._id },
                {
                  $push: { 'playerPool.availablePlayers': playerEntry },
                  $inc: { 'playerPool.totalPlayers': 1 }
                }
              );
            }
          }

          // Remove players that are no longer in the queue from tournament's player pool
          if (removedPlayerIds.length > 0) {
            await Tournament.updateOne(
              { _id: tournament._id },
              {
                $pull: {
                  'playerPool.availablePlayers': {
                    player: { $in: removedPlayerIds.map((id: string) => new mongoose.Types.ObjectId(id)) }
                  }
                },
                $inc: { 'playerPool.totalPlayers': -removedPlayerIds.length }
              }
            );
          }
        }
      } catch (tournamentError) {
        console.error('Error syncing tournament player pool:', tournamentError);
        // Don't fail the auction update if tournament sync fails
      }
    }

    const updatedAuction = await Auction.findById(id);
    
    // Manually populate the fields we need
    let populatedAuction = updatedAuction.toObject();

    // Populate tournament
    if (updatedAuction.tournament) {
      const tournament = await mongoose
        .model("Tournament")
        .findById(updatedAuction.tournament)
        .select("name description")
        .lean();
      populatedAuction.tournament = tournament;
    }

    // Populate current player
    if (updatedAuction.currentPlayer) {
      const currentPlayer = await mongoose
        .model("Player")
        .findById(updatedAuction.currentPlayer)
        .select("name role basePrice image battingHand bowlingHand")
        .lean();
      populatedAuction.currentPlayer = currentPlayer;
    }

    // Populate current bid -> team
    if (updatedAuction.currentBid && updatedAuction.currentBid.bidder) {
      const bidderTeam: any = await mongoose
        .model("Team")
        .findById(updatedAuction.currentBid.bidder)
        .select("name logo")
        .lean();
      populatedAuction.currentBid = {
        amount: updatedAuction.currentBid.amount,
        team: bidderTeam
          ? {
              _id: bidderTeam._id,
              name: bidderTeam.name,
              logo: bidderTeam.logo,
              // best-effort remainingBudget lookup
              remainingBudget:
                updatedAuction.participants?.find(
                  (p: any) => p?.team?.toString?.() === bidderTeam._id.toString()
                )?.remainingBudget || 0,
            }
          : null,
      } as any;
    }

    // Populate participants teams and playersWon
    if (updatedAuction.participants && updatedAuction.participants.length > 0) {
      populatedAuction.participants = await Promise.all(
        updatedAuction.participants.map(async (p: any) => {
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
    if (updatedAuction.playerQueue && updatedAuction.playerQueue.length > 0) {
      const playerQueue = await mongoose
        .model("Player")
        .find({ _id: { $in: updatedAuction.playerQueue } })
        .select("name role basePrice image")
        .lean();
      // Preserve incoming order
      const orderMap = new Map(
        updatedAuction.playerQueue.map((id: any, idx: number) => [id.toString(), idx])
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

    populatedAuction.totalPlayers = populatedAuction.soldPlayers + populatedAuction.unsoldPlayers + (populatedAuction.playerQueue?.length || 0);

    return NextResponse.json({
      success: true,
      data: populatedAuction,
    });
  } catch (error) {
    console.error("Error updating auction:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update auction" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    await connectDB();

    const { id } = await params;

    const auction = await Auction.findById(id);
    if (!auction) {
      return NextResponse.json(
        { success: false, error: "Auction not found" },
        { status: 404 }
      );
    }

    // Check if auction can be deleted (only upcoming auctions)
    if (auction.status !== "upcoming") {
      return NextResponse.json(
        { success: false, error: "Can only delete upcoming auctions" },
        { status: 400 }
      );
    }

    // Delete all associated bids
    await Bid.deleteMany({ auction: id });

    // Delete the auction
    await Auction.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Auction deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting auction:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete auction" },
      { status: 500 }
    );
  }
}
