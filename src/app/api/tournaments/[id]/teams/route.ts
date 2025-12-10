import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Tournament from '@/models/Tournament';
import Team from '@/models/Team';
import mongoose from 'mongoose';
import Auction from '@/models/Auction';

// GET /api/tournaments/[id]/teams - Get teams for a tournament
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

        // Get tournament
    const tournament:any = await Tournament.findById(id).lean();
    if (!tournament) {
      return NextResponse.json(
        { success: false, error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Get all teams (available teams)
    const allTeams = await Team.find({})
      .select('name logo city owner players budget')
      .lean();

    // Get participating teams (if any)
    const participatingTeams = tournament.participatingTeams || [];
    
    return NextResponse.json({
      success: true,
      data: {
        tournament: {
          _id: tournament._id,
          name: tournament.name,
          maxTeams: tournament.maxTeams || (tournament as any).teamConfiguration?.maxTeams || 8
        },
        participatingTeams,
        availableTeams: allTeams,
        stats: {
          totalParticipating: participatingTeams.length,
          totalAvailable: allTeams.length,
          spotsRemaining: (tournament.maxTeams || 8) - participatingTeams.length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching tournament teams:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tournament teams' },
      { status: 500 }
    );
  }
}

// POST /api/tournaments/[id]/teams - Add a team to tournament
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const { teamId, budget } = await request.json();

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(teamId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tournament or team ID' },
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

    // Check if team exists
    const team = await Team.findById(teamId);
    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check if team is already participating
    const participatingTeams = tournament.participatingTeams || [];
    const isAlreadyParticipating = participatingTeams.some(
      (t:any) => t.team?.toString() === teamId
    );

    if (isAlreadyParticipating) {
      return NextResponse.json(
        { success: false, error: 'Team is already participating in this tournament' },
        { status: 400 }
      );
    }

    // Check tournament capacity
    const maxTeams = tournament.maxTeams || tournament.teamConfiguration?.maxTeams || 8;
    if (participatingTeams.length >= maxTeams) {
      return NextResponse.json(
        { success: false, error: 'Tournament is full' },
        { status: 400 }
      );
    }

    // Add team to tournament using direct MongoDB update
    const teamBudget = budget || 50000000; // Default 5 crores
    const newTeamEntry = {
      team: new mongoose.Types.ObjectId(teamId),
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

    // Use direct MongoDB update to avoid schema validation issues
    await Tournament.updateOne(
      { _id: id },
      { 
        $push: { participatingTeams: newTeamEntry },
        $set: { lastModified: new Date() }
      }
    );

    // Also add tournament to team's tournaments array
    try {
      await Team.updateOne(
        { _id: teamId },
        { 
          $addToSet: { tournaments: id },
          $set: { lastUpdated: new Date() }
        }
      );
    } catch (teamError) {
      console.error('Error adding tournament to team:', teamError);
      // Don't fail the tournament addition if team update fails
    }

    // Also add team to auction participants
    try {
      const auction = await Auction.findOne({ tournament: id });
      if (auction) {
        const auctionParticipant = {
          team: new mongoose.Types.ObjectId(teamId),
          remainingBudget: teamBudget,
          playersWon: []
        };
        
        await Auction.updateOne(
          { _id: auction._id },
          { 
            $push: { participants: auctionParticipant },
            $set: { lastModified: new Date() }
          }
        );
      }
    } catch (auctionError) {
      console.error('Error adding team to auction:', auctionError);
      // Don't fail the tournament addition if auction update fails
    }

    // Get updated tournament data
    const updatedTournament:any = await Tournament.findById(id).lean();
    const allTeams = await Team.find({}).select('name logo city owner').lean();

    return NextResponse.json({
      success: true,
      data: {
        tournament: updatedTournament,
        participatingTeams: updatedTournament.participatingTeams || [],
        availableTeams: allTeams
      },
      message: 'Team added to tournament successfully'
    });

  } catch (error) {
    console.error('Error adding team to tournament:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add team to tournament' },
      { status: 500 }
    );
  }
}

// PATCH /api/tournaments/[id]/teams - Update a participating team's status and budget
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const { teamId, status, budget } = await request.json();

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(teamId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tournament or team ID' },
        { status: 400 }
      );
    }

    // Check if tournament exists
    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return NextResponse.json(
        { success: false, error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Check if team exists in tournament
    const participatingTeams = tournament.participatingTeams || [];
    const teamIndex = participatingTeams.findIndex(
      (t:any) => t.team?.toString() === teamId
    );

    if (teamIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Team not found in this tournament' },
        { status: 404 }
      );
    }

    // Update team status and budget
    const update:any = {
      $set: {}
    };

    if (status) {
      update.$set[`participatingTeams.${teamIndex}.status`] = status;
    }

    if (budget) {
      update.$set[`participatingTeams.${teamIndex}.budget.total`] = budget;
      update.$set[`participatingTeams.${teamIndex}.budget.remaining`] = budget;
    }

    await Tournament.updateOne(
      { _id: id },
      update
    );

    return NextResponse.json({
      success: true,
      message: 'Team updated successfully'
    });

  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update team' },
      { status: 500 }
    );
  }
}

// DELETE /api/tournaments/[id]/teams - Remove a team from tournament
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const { teamId } = await request.json();

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(teamId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tournament or team ID' },
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

    // Remove team using direct MongoDB update
    await Tournament.updateOne(
      { _id: id },
      { 
        $pull: { participatingTeams: { team: new mongoose.Types.ObjectId(teamId) } },
        $set: { lastModified: new Date() }
      }
    );

    // Also remove tournament from team's tournaments array
    try {
      await Team.updateOne(
        { _id: teamId },
        { 
          $pull: { tournaments: id },
          $set: { lastUpdated: new Date() }
        }
      );
    } catch (teamError) {
      console.error('Error removing tournament from team:', teamError);
      // Don't fail the tournament removal if team update fails
    }

    // Also remove team from auction participants
    try {
      const auction = await Auction.findOne({ tournament: id });
      if (auction) {
        await Auction.updateOne(
          { _id: auction._id },
          { 
            $pull: { participants: { team: new mongoose.Types.ObjectId(teamId) } },
            $set: { lastModified: new Date() }
          }
        );
      }
    } catch (auctionError) {
      console.error('Error removing team from auction:', auctionError);
      // Don't fail the tournament removal if auction update fails
    }

    return NextResponse.json({
      success: true,
      message: 'Team removed from tournament successfully'
    });

  } catch (error) {
    console.error('Error removing team from tournament:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove team from tournament' },
      { status: 500 }
    );
  }
} 