import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Auction from '@/models/Auction';
import Team from '@/models/Team';
import Tournament from '@/models/Tournament';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { teamId } = await request.json();
    const auctionId = params.id;

    await connectDB();

    // Get the auction and team
    const auction = await Auction.findById(auctionId);
    const team = await Team.findById(teamId);

    if (!auction) {
      return NextResponse.json({ success: false, error: 'Auction not found' }, { status: 404 });
    }

    if (!team) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });
    }

    // Check if team is already in auction
    if (auction.participants.some((p:any) => p.team.toString() === teamId)) {
      return NextResponse.json({ success: false, error: 'Team is already in auction' }, { status: 400 });
    }

    // Ensure team is a participant in the auction's tournament
    const tournament = await Tournament.findById(auction.tournament).select('participatingTeams.team');
    const isRegistered = tournament?.participatingTeams?.some((p: any) => p.team?.toString() === teamId);
    if (!isRegistered) {
      return NextResponse.json({ success: false, error: 'Team is not registered in this tournament' }, { status: 400 });
    }

    // Add team to auction
    auction.participants.push({
      team: teamId,
      remainingBudget: auction.totalBudget,
      playersWon: []
    });

    try {
      const tournament = await Tournament.findById(auction.tournament);
      if (tournament) {
        const isAlreadyInTournament = tournament.participatingTeams?.some(
          (p: any) => p.team?.toString() === teamId
        );
        
        if (!isAlreadyInTournament) {
          const teamBudget = auction.totalBudget; // Use auction budget as tournament budget
          const newTeamEntry = {
            team: teamId,
            registrationDate: new Date(),
            status: 'registered',
            budget: {
              total: teamBudget,
              used: 0,
              remaining: teamBudget
            },
            squadPlayers: [],
            teamStats: {
              matchesPlayed: 0,
              matchesWon: 0,
              matchesLost: 0,
              matchesTied: 0,
              points: 0
            }
          };

          await Tournament.updateOne(
            { _id: tournament._id },
            { 
              $push: { participatingTeams: newTeamEntry },
              $set: { lastModified: new Date() }
            }
          );
        }
      }
    } catch (tournamentError) {
      console.error('Error adding team to tournament:', tournamentError);
      // Don't fail the auction addition if tournament update fails
    }


    await auction.save();

    return NextResponse.json({ success: true, message: 'Team added successfully' });
  } catch (error) {
    console.error('Error adding team to auction:', error);
    return NextResponse.json({ success: false, error: 'Failed to add team' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { teamId } = await request.json();
    const auctionId = params.id;

    await connectDB();

    // Get the auction
    const auction = await Auction.findById(auctionId);

    if (!auction) {
      return NextResponse.json({ success: false, error: 'Auction not found' }, { status: 404 });
    }

    // Check if auction is not upcoming
    if (auction.status !== 'upcoming') {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot remove teams once auction has started' 
      }, { status: 400 });
    }

    // Remove team from auction
    auction.participants = auction.participants.filter((p:any) => p.team.toString() !== teamId);

    await auction.save();

    return NextResponse.json({ success: true, message: 'Team removed successfully' });
  } catch (error) {
    console.error('Error removing team from auction:', error);
    return NextResponse.json({ success: false, error: 'Failed to remove team' }, { status: 500 });
  }
} 