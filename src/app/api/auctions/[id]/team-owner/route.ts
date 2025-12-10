import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Auction from '@/models/Auction';
import { getCurrentUser } from '@/lib/auth';
import User from '@/models/User';
import Tournament from '@/models/Tournament';
import Player from '@/models/Player';
import Bid from '@/models/Bid';

// Define interfaces for better type safety
interface UserWithTeam {
  _id: string;
  name: string;
  email: string;
  role: string;
  team?: {
    _id: string;
    name: string;
    logo?: string;
  };
}

interface TeamParticipant {
  team: mongoose.Types.ObjectId;
  remainingBudget: number;
  playersWon: mongoose.Types.ObjectId[];
  _id: string;
}

interface Bid {
  _id: string;
  team: {
    _id: string;
    name: string;
    logo?: string;
    remainingBudget: number;
  };
  amount: number;
  timestamp: Date;
  status: string;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();

    // Get the authenticated user from cookies
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get auction ID from params
    const { id } = params;
    const userId = user.id;

    // Get auction with populated data
    const auction = await Auction.findById(id);
    if (!auction) {
      return NextResponse.json({ success: false, error: 'Auction not found' }, { status: 404 });
    }

    // Get the tournament to check if user is admin/moderator
    const tournament = await Tournament.findById(auction.tournament);
    if (!tournament) {
      return NextResponse.json({ success: false, error: 'Tournament not found' }, { status: 404 });
    }

    let userTeam: UserWithTeam['team'] | null = null;
    let teamParticipant: TeamParticipant | null = null;

    // If user is team-owner, verify team participation
    if (user.role === 'team-owner') {
      // Get user's team
      const userWithTeam = await User.findById(userId).populate('team').lean() as UserWithTeam | null;

      // For team owners, we need a team
      if (!userWithTeam?.team) {
        return NextResponse.json({ 
          success: false, 
          error: 'No team associated with user. Please contact an administrator to assign you a team.' 
        }, { status: 400 });
      }
      
      userTeam = userWithTeam.team;

      // Check if user's team is a participant
      teamParticipant = auction.participants.find((p: TeamParticipant) => p.team.toString() === userTeam!._id.toString());
      if (!teamParticipant) {
        return NextResponse.json({ 
          success: false, 
          error: 'Your team is not participating in this auction. Please wait for the tournament organizer to add your team.' 
        }, { status: 403 });
      }
    }
    // For admin/moderator, check if they are associated with the tournament
    else if (user.role === 'admin' || user.role === 'moderator') {
      // Admins always have access
      if (user.role !== 'admin') {
              // Check if moderator is in auction.moderators
      const isModerator = auction.moderators?.some((mod: mongoose.Types.ObjectId) => mod.toString() === userId.toString());
        if (!isModerator) {
          return NextResponse.json({ 
            success: false, 
            error: 'You are not a moderator of this auction. Please contact the tournament administrator.' 
          }, { status: 403 });
        }
      }
    }

    let populatedAuction = auction.toObject();
    
    // Populate necessary fields
    populatedAuction.tournament = await Tournament
    .findById(auction.tournament)
    .select('name description')
    .lean();
    
    if (auction.currentPlayer) {
      populatedAuction.currentPlayer = await Player
      .findById(auction.currentPlayer)
      .select('name role basePrice image battingHand bowlingHand stats')
      .lean();
    }

    // Populate participants teams and playersWon
    if (auction.participants && auction.participants.length > 0) {
      populatedAuction.participants = await Promise.all(
        auction.participants.map(async (participant: any) => {
          // Populate team data
          const team = await mongoose
            .model("Team")
            .findById(participant.team)
            .select("name logo")
            .lean();

          // Get players won by this team
          let playersWon: any[] = [];
          if (participant.playersWon && participant.playersWon.length > 0) {
            playersWon = await Player
              .find({ _id: { $in: participant.playersWon } })
              .select('name role basePrice soldPrice image battingHand bowlingHand stats')
              .lean();
          }

          return {
            team: team || { _id: participant.team, name: 'Unknown Team', logo: null },
            remainingBudget: participant.remainingBudget,
            playersWon
          };
        })
      );
    }

    // Get recent bids
    const recentBids = await Bid
      .find({ auction: id })
      .sort({ timestamp: -1 })
      .limit(20)
      .populate('bidder', 'name logo')
      .lean();

    // Get current player bids if there's a current player
    let currentPlayerBids: any[] = [];
    if (auction.currentPlayer) {
      currentPlayerBids = await Bid
        .find({ auction: id, player: auction.currentPlayer })
        .sort({ timestamp: -1 })
        .populate('bidder', 'name logo remainingBudget')
        .lean();
    }

    // Get team data based on user role
    let myTeam = null;
    let myTeamPlayersWon:any = [];
    if (user.role === 'team-owner' && userTeam && teamParticipant) {
      // Get the players won by this team
      if (teamParticipant.playersWon && teamParticipant.playersWon.length > 0) {
        myTeamPlayersWon = await Player
          .find({ _id: { $in: teamParticipant.playersWon } })
          .select('name role basePrice soldPrice image battingHand bowlingHand stats')
          .lean();
      }
      
      myTeam = {
        _id: userTeam._id,
        name: userTeam.name,
        logo: userTeam.logo,
        remainingBudget: teamParticipant.remainingBudget,
        playersWon: myTeamPlayersWon
      };
    } else if (user.role === 'admin' || user.role === 'moderator') {
      // For admin/moderator, provide a view-only team object
      myTeam = {
        _id: 'admin',
        name: user.role.toUpperCase(),
        logo: null,
        remainingBudget: 0 // View-only mode, can't place bids
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        auction: populatedAuction,
        recentBids,
        currentPlayerBids,
        myTeam,
        userRole: user.role // Include user role for UI adaptation
      }
    });

  } catch (error) {
    console.error('Error fetching auction for team owner:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch auction details' },
      { status: 500 }
    );
  }
} 