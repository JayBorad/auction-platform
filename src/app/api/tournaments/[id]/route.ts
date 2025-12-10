import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Tournament from '@/models/Tournament';
import Team from '@/models/Team';
import Player from '@/models/Player';
import Auction from '@/models/Auction';
import mongoose from 'mongoose';
import { getCurrentUser } from '@/lib/auth';

// GET /api/tournaments/[id] - Get a specific tournament
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    // First, get the basic tournament data
    const tournament:any = await Tournament.findById(id)
      .populate({
        path: 'participatingTeams.team',
        select: 'name logo city owner'
      })
      .populate({
        path: 'playerPool.availablePlayers.player',
        select: 'name role basePrice image nationality age'
      })
      .lean();

    if (!tournament) {
      return NextResponse.json(
        { success: false, error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Get related data separately to avoid populate issues
    const teams = await Team.find({}).select('name logo city owner').lean();
    const players = await Player.find({}).select('name role basePrice image nationality age').lean();
    const auctions = await Auction.find({ tournament: id }).select('name status startDate endDate currentPlayer currentBid').lean();

    // Calculate basic statistics
    const stats = {
      totalTeams: tournament.participatingTeams?.length || 0,
      totalPlayers: tournament.playerPool?.totalPlayers || 0,
      soldPlayers: tournament.playerPool?.soldPlayers?.length || 0,
      unsoldPlayers: tournament.playerPool?.unsoldPlayers?.length || 0,
      availablePlayers: tournament.playerPool?.availablePlayers?.filter((p:any) => p.status === 'available')?.length || 0,
      totalBudgetAllocated: tournament.participatingTeams?.reduce((total:any, team:any) => total + (team.budget?.used || 0), 0) || 0,
      averagePlayerPrice: 0,
      auctionsCompleted: auctions.filter(a => a.status === 'completed').length,
      auctionsScheduled: auctions.filter(a => a.status === 'scheduled').length,
      liveAuctions: auctions.filter(a => a.status === 'live').length
    };

    // Transform the tournament data to match frontend expectations
    const transformedTournament = {
      _id: tournament._id,
      name: tournament.name,
      description: tournament.description,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      registrationStartDate: tournament.registrationStartDate,
      registrationEndDate: tournament.registrationEndDate,
      status: tournament.status,
      maxTeams: tournament.maxTeams || tournament.teamConfiguration?.maxTeams || 8,
      registeredTeams: tournament.participatingTeams?.length || 0,
      entryFee: tournament.entryFee || tournament.financial?.entryFee || 0,
      prizePool: tournament.prizePool || tournament.financial?.totalBudget || tournament.financial?.totalPrizePool || 0,
      format: tournament.format,
      venue: tournament.venue?.name ?? tournament.venue ?? '',
      city: tournament.city || tournament.venue?.city || '',
      country: tournament.country || tournament.venue?.country || 'India',
      organizer: tournament.organizer?.name ?? tournament.organizer ?? '',
      contactEmail: tournament.contactEmail || tournament.organizer?.email || '',
      contactPhone: tournament.contactPhone || tournament.organizer?.phone || '',
      rules: tournament.rules || '',
      prizes: {
        winner: tournament.financial?.prizeDistribution?.winner || 0,
        runnerUp: tournament.financial?.prizeDistribution?.runnerUp || 0,
        thirdPlace: tournament.financial?.prizeDistribution?.thirdPlace || 0
      },
      isPublic: tournament.isPublic !== false,
      isActive: tournament.isActive !== false,
      createdBy: tournament.createdBy,
      updatedBy: tournament.updatedBy,
      createdAt: tournament.createdAt,
      updatedAt: tournament.updatedAt,
      
      // Extended data for advanced features
      participatingTeams: tournament.participatingTeams || [],
      playerPool: tournament.playerPool || {
        totalPlayers: 0,
        availablePlayers: [],
        soldPlayers: [],
        unsoldPlayers: []
      },
      teamConfiguration: tournament.teamConfiguration || {
        maxTeams: tournament.maxTeams || 8,
        minPlayersPerTeam: 11,
        maxPlayersPerTeam: 25,
        maxForeignPlayers: 4,
        captainRequired: true,
        wicketKeeperRequired: true
      },
      financial: tournament.financial || {
        totalBudget: tournament.prizePool || 0,
        entryFee: tournament.entryFee || 0,
        prizeDistribution: {
          winner: tournament.financial?.prizeDistribution?.winner || 0,
          runnerUp: tournament.financial?.prizeDistribution?.runnerUp || 0,
          thirdPlace: tournament.financial?.prizeDistribution?.thirdPlace || 0,
          fourthPlace: tournament.financial?.prizeDistribution?.fourthPlace || 0,
          other: tournament.financial?.prizeDistribution?.other || 0
        }
      },
      settings: tournament.settings || {
        auctionSettings: {
          bidIncrement: 100000,
          timePerBid: 30,
          maxBidsPerPlayer: 50,
          rtmpEnabled: true
        }
      },
      auctions: tournament.auctions || []
    };

    return NextResponse.json({
      success: true,
      data: {
        tournament: transformedTournament,
        stats,
        relatedData: {
          availableTeams: teams,
          availablePlayers: players,
          auctions
        }
      }
    });

  } catch (error) {
    console.error('Error fetching tournament:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tournament' },
      { status: 500 }
    );
  }
}

// PUT /api/tournaments/[id] - Update a tournament
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    // Build $set update mapping flat fields to nested schema
    const updateData: any = { lastModified: new Date() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.format !== undefined) updateData.format = body.format;
    if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) updateData.endDate = new Date(body.endDate);
    if (body.registrationStartDate !== undefined) updateData.registrationStartDate = new Date(body.registrationStartDate);
    if (body.registrationEndDate !== undefined) updateData.registrationEndDate = new Date(body.registrationEndDate);

    if (body.maxTeams !== undefined) {
      updateData['teamConfiguration.maxTeams'] = body.maxTeams;
    }
    if (body.venue !== undefined || body.city !== undefined || body.country !== undefined) {
      if (body.venue !== undefined) updateData['venue.name'] = body.venue;
      if (body.city !== undefined) updateData['venue.city'] = body.city;
      if (body.country !== undefined) updateData['venue.country'] = body.country;
    }
    if (body.organizer !== undefined || body.contactEmail !== undefined || body.contactPhone !== undefined) {
      if (body.organizer !== undefined) updateData['organizer.name'] = body.organizer;
      if (body.contactEmail !== undefined) updateData['organizer.email'] = body.contactEmail;
      if (body.contactPhone !== undefined) updateData['organizer.phone'] = body.contactPhone;
    }
    if (body.entryFee !== undefined) updateData['financial.entryFee'] = body.entryFee;
    if (body.prizePool !== undefined) updateData['financial.totalPrizePool'] = body.prizePool;
    if (body.rules !== undefined) updateData.rules = body.rules;
    if (body.isPublic !== undefined) updateData['settings.isPublic'] = body.isPublic;
    
    // Handle prizes object - map to financial.prizeDistribution
    if (body.prizes !== undefined && typeof body.prizes === 'object') {
      if (body.prizes.winner !== undefined) updateData['financial.prizeDistribution.winner'] = body.prizes.winner;
      if (body.prizes.runnerUp !== undefined) updateData['financial.prizeDistribution.runnerUp'] = body.prizes.runnerUp;
      if (body.prizes.thirdPlace !== undefined) updateData['financial.prizeDistribution.thirdPlace'] = body.prizes.thirdPlace;
    }

    const updated:any = await Tournament.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Normalize the response similar to GET/PATCH
    const uiStatusMap: Record<string, string> = {
      draft: 'upcoming',
      registration_open: 'upcoming',
      registration_closed: 'upcoming',
      team_selection: 'upcoming',
      auction_phase: 'upcoming',
      active: 'active',
      completed: 'completed',
      cancelled: 'cancelled',
    };

    const normalized = {
      _id: updated._id,
      name: updated.name,
      description: updated.description,
      startDate: updated.startDate,
      endDate: updated.endDate,
      registrationStartDate: updated.registrationStartDate,
      registrationEndDate: updated.registrationEndDate,
      status: uiStatusMap[updated.status] || updated.status,
      maxTeams: updated.maxTeams || updated.teamConfiguration?.maxTeams || 8,
      registeredTeams: Array.isArray(updated.participatingTeams) ? updated.participatingTeams.length : 0,
      entryFee: updated.entryFee ?? updated.financial?.entryFee ?? 0,
      prizePool: updated.prizePool ?? updated.financial?.totalPrizePool ?? 0,
      format: updated.format,
      venue: updated.venue?.name ?? updated.venue ?? '',
      city: updated.city ?? updated.venue?.city ?? '',
      country: updated.country ?? updated.venue?.country ?? 'India',
      organizer: updated.organizer?.name ?? updated.organizer ?? '',
      contactEmail: updated.contactEmail ?? updated.organizer?.email ?? '',
      contactPhone: updated.contactPhone ?? updated.organizer?.phone ?? '',
      rules: updated.rules || '',
      prizes: {
        winner: updated.financial?.prizeDistribution?.winner || 0,
        runnerUp: updated.financial?.prizeDistribution?.runnerUp || 0,
        thirdPlace: updated.financial?.prizeDistribution?.thirdPlace || 0
      },
      isPublic: updated.settings?.isPublic !== false,
      isActive: updated.isActive !== false,
      createdBy: updated.createdBy,
      updatedBy: updated.updatedBy,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      
      // Extended data for advanced features
      participatingTeams: updated.participatingTeams || [],
      playerPool: updated.playerPool || {
        totalPlayers: 0,
        availablePlayers: [],
        soldPlayers: [],
        unsoldPlayers: []
      },
      teamConfiguration: updated.teamConfiguration || {
        maxTeams: updated.maxTeams || 8,
        minPlayersPerTeam: 11,
        maxPlayersPerTeam: 25,
        maxForeignPlayers: 4,
        captainRequired: true,
        wicketKeeperRequired: true
      },
      financial: updated.financial || {
        totalBudget: updated.prizePool || 0,
        entryFee: updated.entryFee || 0,
        prizeDistribution: {
          winner: updated.financial?.prizeDistribution?.winner || 0,
          runnerUp: updated.financial?.prizeDistribution?.runnerUp || 0,
          thirdPlace: updated.financial?.prizeDistribution?.thirdPlace || 0,
          fourthPlace: updated.financial?.prizeDistribution?.fourthPlace || 0,
          others: updated.financial?.prizeDistribution?.other || 0
        }
      },
      settings: updated.settings || {
        auctionSettings: {
          bidIncrement: 100000,
          timePerBid: 30,
          maxBidsPerPlayer: 50,
          rtmpEnabled: true
        }
      },
      auctions: updated.auctions || []
    };

    return NextResponse.json({
      success: true,
      data: normalized,
      message: 'Tournament updated successfully'
    });

  } catch (error) {
    console.error('Error updating tournament:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update tournament' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status, action } = await request.json();

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tournament ID' },
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

    let updateData: any = {};

    if (status) {
      // Accept UI statuses and map to model statuses
      const statusMap: Record<string, string> = {
        upcoming: 'draft',
        active: 'active',
        completed: 'completed',
        cancelled: 'cancelled',
      };
      const mappedStatus = statusMap[status] || status; // If already internal, keep as is
      updateData = { status: mappedStatus, lastModified: new Date() };
    }

    if (action) {
      switch (action) {
        case 'start_registration':
          updateData = { 
            status: 'registration_open',
            lastModified: new Date()
          };
          break;
        case 'close_registration':
          updateData = { 
            status: 'registration_closed',
            lastModified: new Date()
          };
          break;
        case 'start_auction':
          updateData = { 
            status: 'auction_phase',
            lastModified: new Date()
          };
          break;
        case 'start_tournament':
          updateData = { 
            status: 'active',
            lastModified: new Date()
          };
          break;
        case 'complete_tournament':
          updateData = { 
            status: 'completed',
            lastModified: new Date()
          };
          break;
        case 'cancel_tournament':
          updateData = { 
            status: 'cancelled',
            lastModified: new Date()
          };
          break;
        default:
          return NextResponse.json(
            { success: false, error: 'Invalid action' },
            { status: 400 }
          );
      }
    }

    const updatedTournamentRaw:any = await Tournament.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).lean();

    // Normalize status back for UI and basic fields
    const uiStatusMap: Record<string, string> = {
      draft: 'upcoming',
      registration_open: 'upcoming',
      registration_closed: 'upcoming',
      team_selection: 'upcoming',
      auction_phase: 'upcoming',
      active: 'active',
      completed: 'completed',
      cancelled: 'cancelled',
    };

    const normalized = updatedTournamentRaw
      ? {
          _id: updatedTournamentRaw._id,
          name: updatedTournamentRaw.name,
          description: updatedTournamentRaw.description,
          startDate: updatedTournamentRaw.startDate,
          endDate: updatedTournamentRaw.endDate,
          registrationStartDate: updatedTournamentRaw.registrationStartDate,
          registrationEndDate: updatedTournamentRaw.registrationEndDate,
          status: uiStatusMap[updatedTournamentRaw.status] || updatedTournamentRaw.status,
          maxTeams: updatedTournamentRaw.maxTeams || updatedTournamentRaw.teamConfiguration?.maxTeams || 8,
          registeredTeams: Array.isArray(updatedTournamentRaw.participatingTeams) ? updatedTournamentRaw.participatingTeams.length : 0,
          entryFee: updatedTournamentRaw.entryFee ?? updatedTournamentRaw.financial?.entryFee ?? 0,
          prizePool: updatedTournamentRaw.prizePool ?? updatedTournamentRaw.financial?.totalPrizePool ?? 0,
          format: updatedTournamentRaw.format,
          venue: updatedTournamentRaw.venue?.name ?? updatedTournamentRaw.venue ?? '',
          city: updatedTournamentRaw.city ?? updatedTournamentRaw.venue?.city ?? '',
          country: updatedTournamentRaw.country ?? updatedTournamentRaw.venue?.country ?? 'India',
          organizer: updatedTournamentRaw.organizer?.name ?? updatedTournamentRaw.organizer ?? '',
          contactEmail: updatedTournamentRaw.contactEmail ?? updatedTournamentRaw.organizer?.email ?? '',
          contactPhone: updatedTournamentRaw.contactPhone ?? updatedTournamentRaw.organizer?.phone ?? '',
          createdBy: updatedTournamentRaw.createdBy,
          updatedBy: updatedTournamentRaw.updatedBy,
          createdAt: updatedTournamentRaw.createdAt,
          updatedAt: updatedTournamentRaw.updatedAt,
        }
      : null;

    return NextResponse.json({
      success: true,
      data: normalized || updatedTournamentRaw,
      message: `Tournament ${action || 'status'} updated successfully`,
    });

  } catch (error) {
    console.error('Error updating tournament status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update tournament status' },
      { status: 500 }
    );
  }
}

// DELETE /api/tournaments/[id] - Delete a tournament (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    // Get the authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return NextResponse.json(
        { success: false, error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Get all auctions related to this tournament
    const allAuctions = await Auction.find({ tournament: id });
    const activeAuctions = allAuctions.filter(auction => auction.status === 'live');
    
    // If there are active auctions, only allow deletion if user is admin
    if (activeAuctions.length > 0) {
      if (user.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Cannot delete tournament with active auctions. Only admins can force delete.' },
          { status: 400 }
        );
      }
      
      // Admin can force delete: first end all live auctions
      for (const auction of activeAuctions) {
        await Auction.findByIdAndUpdate(auction._id, {
          status: 'completed',
          endTime: new Date(),
          lastModified: new Date()
        });
      }
    }

    // Get all auction IDs before deletion
    const auctionIds = allAuctions.map(auction => auction._id);

    // Delete all bids related to these auctions first
    if (auctionIds.length > 0) {
      await mongoose.model('Bid').deleteMany({ auction: { $in: auctionIds } });
    }

    // Delete all auctions related to this tournament (including ended ones)
    await Auction.deleteMany({ tournament: id });

    // Delete the tournament
    await Tournament.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: activeAuctions.length > 0 
        ? 'Tournament and related auctions deleted successfully (live auctions were ended first)'
        : 'Tournament and related auctions deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting tournament:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete tournament' },
      { status: 500 }
    );
  }
}