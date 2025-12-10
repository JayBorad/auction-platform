import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Team from '@/models/Team';
import Tournament from '@/models/Tournament';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const team = await Team.findById(params.id)
      .populate('tournaments', 'name status startDate endDate venue format city country')
      .lean();

    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    // Add calculated fields
    const totalMatches = (team as any).totalMatches ?? 0;
    const matchesWon = (team as any).matchesWon ?? 0;
    const players = (team as any).players ?? [];
    const activePlayers = Array.isArray(players) ? players.filter((p: any) => p.isActive) : [];

    const teamWithStats = {
      ...team,
      winPercentage: totalMatches > 0
        ? ((matchesWon / totalMatches) * 100).toFixed(2)
        : '0.00',
      playerCount: activePlayers.length,
      activePlayers: activePlayers
    };

    return NextResponse.json({
      success: true,
      data: teamWithStats
    });

  } catch (error: any) {
    console.error('Error fetching team:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch team' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const body = await request.json();

    // Check if team exists
    const existingTeam = await Team.findById(params.id);
    if (!existingTeam) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check for duplicate name/shortName if they're being changed
    if (body.name && body.name !== existingTeam.name) {
      const duplicateName = await Team.findOne({ 
        name: body.name, 
        _id: { $ne: params.id } 
      });
      if (duplicateName) {
        return NextResponse.json(
          { success: false, error: 'Team name already exists' },
          { status: 400 }
        );
      }
    }

    if (body.shortName && body.shortName.toUpperCase() !== existingTeam.shortName) {
      const duplicateShortName = await Team.findOne({ 
        shortName: body.shortName.toUpperCase(), 
        _id: { $ne: params.id } 
      });
      if (duplicateShortName) {
        return NextResponse.json(
          { success: false, error: 'Team short name already exists' },
          { status: 400 }
        );
      }
    }

    // Extract captain and vice captain names from Player objects
    let captainName = existingTeam.captain;
    let viceCaptainName = existingTeam.viceCaptain;

    if (body.captain !== undefined) {
      captainName = typeof body.captain === 'object' ? body.captain.name : body.captain;
    }

    if (body.viceCaptain !== undefined) {
      viceCaptainName = body.viceCaptain && typeof body.viceCaptain === 'object' ? body.viceCaptain.name : body.viceCaptain;
    }

    // Validate captain is provided
    if (!captainName) {
      return NextResponse.json(
        { success: false, error: 'Captain name is required' },
        { status: 400 }
      );
    }

    // Validate tournaments if provided
    if (body.tournaments && body.tournaments.length > 0) {
      const validTournaments = await Tournament.find({
        _id: { $in: body.tournaments },
        status: { $in: ['upcoming', 'active'] }
      });

      if (validTournaments.length !== body.tournaments.length) {
        return NextResponse.json(
          { success: false, error: 'One or more tournaments are invalid or not accepting registrations' },
          { status: 400 }
        );
      }
    }

    // Prepare players array
    let players = body.players || existingTeam.players;

    // Ensure captain is in players list
    const captainInPlayers = players.some((player: any) => 
      player.name === captainName && player.isActive !== false
    );
    
    if (!captainInPlayers) {
      // Add captain to players if not present
      const captainData = typeof body.captain === 'object' ? body.captain : {
        name: captainName,
        age: 25,
        role: 'all-rounder',
        battingStyle: 'right-hand',
        bowlingStyle: 'none',
        jerseyNumber: 1,
        contactNumber: '',
        email: '',
        isActive: true
      };
      players.push(captainData);
    }

    // Ensure vice captain is in players list if provided
    if (viceCaptainName) {
      const viceCaptainInPlayers = players.some((player: any) => 
        player.name === viceCaptainName && player.isActive !== false
      );
      
      if (!viceCaptainInPlayers) {
        // Add vice captain to players if not present
        const viceCaptainData = typeof body.viceCaptain === 'object' ? body.viceCaptain : {
          name: viceCaptainName,
          age: 25,
          role: 'all-rounder',
          battingStyle: 'right-hand',
          bowlingStyle: 'none',
          jerseyNumber: 2,
          contactNumber: '',
          email: '',
          isActive: true
        };
        players.push(viceCaptainData);
      }
    }

    // Update team with string captain/viceCaptain names
    const updatedTeam = await Team.findByIdAndUpdate(
      params.id,
      { 
        ...body,
        shortName: body.shortName ? body.shortName.toUpperCase() : existingTeam.shortName,
        captain: captainName,
        viceCaptain: viceCaptainName,
        players: players,
        lastUpdated: new Date() 
      },
      { new: true, runValidators: true }
    ).populate('tournaments', 'name status');

    return NextResponse.json({
      success: true,
      data: updatedTeam,
      message: 'Team updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating team:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, error: validationErrors.join(', ') },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update team' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const team = await Team.findById(params.id);
    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check if team is registered in any active tournaments
    const activeTournaments = await Tournament.find({
      _id: { $in: team.tournaments },
      status: { $in: ['upcoming', 'active'] }
    });

    if (activeTournaments.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete team registered in active tournaments. Please remove from tournaments first.' 
        },
        { status: 400 }
      );
    }

    await Team.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
      message: 'Team deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete team' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const body = await request.json();
    const { action, ...data } = body;

    const team = await Team.findById(params.id);
    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    let updatedTeam;

    switch (action) {
      case 'updateStatus':
        updatedTeam = await Team.findByIdAndUpdate(
          params.id,
          { isActive: data.isActive, lastUpdated: new Date() },
          { new: true }
        ).populate('tournaments', 'name status');
        break;

      case 'addPlayer':
        // Validate jersey number uniqueness
        if (data.jerseyNumber) {
          const existingJersey = team.players.find(
            (p: any) => p.isActive && p.jerseyNumber === data.jerseyNumber
          );
          if (existingJersey) {
            return NextResponse.json(
              { success: false, error: 'Jersey number already taken' },
              { status: 400 }
            );
          }
        }

        team.players.push({ ...data, isActive: true });
        await team.save();
        updatedTeam = await team.populate('tournaments', 'name status');
        break;

      case 'updatePlayer':
        const playerIndex = team.players.findIndex((p: any) => p.name === data.playerName);
        if (playerIndex === -1) {
          return NextResponse.json(
            { success: false, error: 'Player not found' },
            { status: 404 }
          );
        }

        // Validate jersey number uniqueness (excluding current player)
        if (data.jerseyNumber) {
          const existingJersey = team.players.find(
            (p:any, index:number) => index !== playerIndex && p.isActive && p.jerseyNumber === data.jerseyNumber
          );
          if (existingJersey) {
            return NextResponse.json(
              { success: false, error: 'Jersey number already taken' },
              { status: 400 }
            );
          }
        }

        team.players[playerIndex] = { ...team.players[playerIndex], ...data };
        await team.save();
        updatedTeam = await team.populate('tournaments', 'name status');
        break;

      case 'removePlayer':
        const removeIndex = team.players.findIndex((p: any) => p.name === data.playerName);
        if (removeIndex === -1) {
          return NextResponse.json(
            { success: false, error: 'Player not found' },
            { status: 404 }
          );
        }

        // Check if player is captain
        if (team.players[removeIndex].name === team.captain) {
          return NextResponse.json(
            { success: false, error: 'Cannot remove team captain. Please change captain first.' },
            { status: 400 }
          );
        }

        team.players[removeIndex].isActive = false;
        await team.save();
        updatedTeam = await team.populate('tournaments', 'name status');
        break;

      case 'updateStats':
        const { matchesWon, matchesLost, matchesDrawn, points, netRunRate } = data;
        const totalMatches = (matchesWon || 0) + (matchesLost || 0) + (matchesDrawn || 0);
        
        updatedTeam = await Team.findByIdAndUpdate(
          params.id,
          {
            totalMatches,
            matchesWon: matchesWon || 0,
            matchesLost: matchesLost || 0,
            matchesDrawn: matchesDrawn || 0,
            points: points || 0,
            netRunRate: netRunRate || 0,
            lastUpdated: new Date()
          },
          { new: true }
        ).populate('tournaments', 'name status');
        break;

      case 'joinTournament':
        // Validate tournament
        const tournament = await Tournament.findById(data.tournamentId);
        if (!tournament) {
          return NextResponse.json(
            { success: false, error: 'Tournament not found' },
            { status: 404 }
          );
        }

        if (!['registration_open', 'active'].includes(tournament.status)) {
          return NextResponse.json(
            { success: false, error: 'Tournament is not accepting registrations' },
            { status: 400 }
          );
        }

        if (team.tournaments.includes(data.tournamentId)) {
          return NextResponse.json(
            { success: false, error: 'Team already registered for this tournament' },
            { status: 400 }
          );
        }

        team.tournaments.push(data.tournamentId);
        await team.save();
        updatedTeam = await team.populate('tournaments', 'name status');
        break;

      case 'leaveTournament':
        const tournamentIndex = team.tournaments.indexOf(data.tournamentId);
        if (tournamentIndex === -1) {
          return NextResponse.json(
            { success: false, error: 'Team not registered for this tournament' },
            { status: 400 }
          );
        }

        team.tournaments.splice(tournamentIndex, 1);
        await team.save();
        updatedTeam = await team.populate('tournaments', 'name status');
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: updatedTeam,
      message: `Team ${action} completed successfully`
    });

  } catch (error: any) {
    console.error('Error updating team:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, error: validationErrors.join(', ') },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update team' },
      { status: 500 }
    );
  }
} 