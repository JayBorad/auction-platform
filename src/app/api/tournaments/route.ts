import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Tournament from '@/models/Tournament';
import User from '@/models/User';
import Auction from '@/models/Auction';

// Ensure User model is registered
User;

// GET /api/tournaments - Fetch all tournaments with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    const query: any = {};
    
    if (status && status !== 'all') {
      // Map UI status to model status if necessary
      // UI uses: upcoming, active, completed, cancelled
      // Model uses: draft, registration_open, registration_closed, team_selection, auction_phase, active, completed, cancelled
      const statusMap: Record<string, string> = {
        upcoming: 'draft',
        active: 'active',
        completed: 'completed',
        cancelled: 'cancelled',
        registration_open: 'registration_open',
      };
      query.status = statusMap[status] || status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { venue: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const tournamentsRaw = await Tournament.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Normalize tournaments to match frontend expectations
    // Normalize tournaments to match frontend expectations
    const tournaments = tournamentsRaw.map((t: any) => {
      const uiStatusMap: Record<string, string> = {
        draft: 'upcoming',
        registration_open: 'registration_open',
        registration_closed: 'upcoming',
        team_selection: 'upcoming',
        auction_phase: 'upcoming',
        active: 'active',
        completed: 'completed',
        cancelled: 'cancelled',
      };

      return {
        _id: t._id,
        name: t.name,
        description: t.description,
        startDate: t.startDate,
        endDate: t.endDate,
        registrationStartDate: t.registrationStartDate,
        registrationEndDate: t.registrationEndDate,
        status: uiStatusMap[t.status] || t.status || 'upcoming',
        maxTeams: t.maxTeams || t.teamConfiguration?.maxTeams || 8,
        registeredTeams: Array.isArray(t.participatingTeams) ? t.participatingTeams.length : 0,
        entryFee: t.entryFee ?? t.financial?.entryFee ?? 0,
        prizePool: t.prizePool ?? t.financial?.totalPrizePool ?? 0,
        format: t.format,
        venue: t.venue?.name ?? t.venue ?? '',
        city: t.city ?? t.venue?.city ?? '',
        country: t.country ?? t.venue?.country ?? 'India',
        organizer: t.organizer?.name ?? t.organizer ?? '',
        contactEmail: t.contactEmail ?? t.organizer?.email ?? '',
        contactPhone: t.contactPhone ?? t.organizer?.phone ?? '',
        rules: t.rules || '',
        prizes: {
          winner: t.financial?.prizeDistribution?.winner || 0,
          runnerUp: t.financial?.prizeDistribution?.runnerUp || 0,
          thirdPlace: t.financial?.prizeDistribution?.thirdPlace || 0
        },
        isPublic: t.isPublic !== false,
        isActive: t.isActive !== false,
        createdBy: t.createdBy,
        updatedBy: t.updatedBy,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      };
    });

    // Get total count for pagination
    const total = await Tournament.countDocuments(query);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        tournaments,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage,
          hasPrevPage,
        },
      },
    });

  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tournaments' },
      { status: 500 }
    );
  }
}

// POST /api/tournaments - Create a new tournament
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const userId = body.createdBy || '507f1f77bcf86cd799439011';

    const requiredFields = [
      'name','description','startDate','endDate','registrationStartDate','registrationEndDate',
      'maxTeams','entryFee','prizePool','format','venue','city','organizer','contactEmail','contactPhone'
    ];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ success: false, error: `${field} is required` }, { status: 400 });
      }
    }

    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    const regStartDate = new Date(body.registrationStartDate);
    const regEndDate = new Date(body.registrationEndDate);
    if (startDate >= endDate) return NextResponse.json({ success: false, error: 'End date must be after start date' }, { status: 400 });
    if (regStartDate >= regEndDate) return NextResponse.json({ success: false, error: 'Registration end date must be after registration start date' }, { status: 400 });
    if (regEndDate > startDate) return NextResponse.json({ success: false, error: 'Registration must end before tournament starts' }, { status: 400 });

    const tournament = new Tournament({
      name: body.name,
      description: body.description,
      startDate,
      endDate,
      registrationStartDate: regStartDate,
      registrationEndDate: regEndDate,
      status: 'draft',
      format: body.format,
      teamConfiguration: { maxTeams: body.maxTeams },
      venue: { name: body.venue, city: body.city, country: body.country || 'India' },
      organizer: { name: body.organizer, email: body.contactEmail, phone: body.contactPhone },
      financial: { 
        entryFee: body.entryFee, 
        totalPrizePool: body.prizePool,
        prizeDistribution: body.prizes ? {
          winner: body.prizes.winner || 0,
          runnerUp: body.prizes.runnerUp || 0,
          thirdPlace: body.prizes.thirdPlace || 0,
          fourthPlace: 0,
          other: 0
        } : {
          winner: 0,
          runnerUp: 0,
          thirdPlace: 0,
          fourthPlace: 0,
          other: 0
        }
      },
      rules: body.rules || undefined,
      settings: { isPublic: body.isPublic !== false },
      createdBy: userId,
    });

    await tournament.save();

    try {
      const auction = new Auction({
        name: `${tournament.name} Player Auction`,
        tournament: tournament._id,
        startDate: new Date(regEndDate.getTime() + 24 * 60 * 60 * 1000),
        endDate: new Date(startDate.getTime() - 24 * 60 * 60 * 1000),
        totalBudget: Math.max((tournament.financial?.totalPrizePool || 0) * 0.8, 50000000),
        status: 'upcoming',
        participants: [],
        playerQueue: [],
        rules: {
          maxBidIncrement: 500000,
          bidTimeout: 30000,
          maxPlayersPerTeam: (tournament.teamConfiguration?.maxTeams || 8) <= 8 ? 15 : 11,
          maxForeignPlayers: 4,
        },
        createdBy: userId,
      });
      await auction.save();

      const uiStatusMap: Record<string, string> = {
        draft: 'upcoming', registration_open: 'registration_open', registration_closed: 'upcoming',
        team_selection: 'upcoming', auction_phase: 'upcoming', active: 'active', completed: 'completed', cancelled: 'cancelled',
      };
      const t: any = tournament.toObject ? tournament.toObject() : tournament;
      const normalized = {
        _id: t._id,
        name: t.name,
        description: t.description,
        startDate: t.startDate,
        endDate: t.endDate,
        registrationStartDate: t.registrationStartDate,
        registrationEndDate: t.registrationEndDate,
        status: uiStatusMap[t.status] || t.status || 'upcoming',
        maxTeams: t.maxTeams || t.teamConfiguration?.maxTeams || body.maxTeams || 8,
        registeredTeams: Array.isArray(t.participatingTeams) ? t.participatingTeams.length : 0,
        entryFee: t.entryFee ?? t.financial?.entryFee ?? body.entryFee ?? 0,
        prizePool: t.prizePool ?? t.financial?.totalPrizePool ?? body.prizePool ?? 0,
        format: t.format,
        venue: t.venue?.name ?? t.venue ?? body.venue ?? '',
        city: t.city ?? t.venue?.city ?? body.city ?? '',
        country: t.country ?? t.venue?.country ?? body.country ?? 'India',
        organizer: t.organizer?.name ?? t.organizer ?? body.organizer ?? '',
        contactEmail: t.contactEmail ?? t.organizer?.email ?? body.contactEmail ?? '',
        contactPhone: t.contactPhone ?? t.organizer?.phone ?? body.contactPhone ?? '',
        rules: t.rules || '',
        prizes: {
          winner: t.financial?.prizeDistribution?.winner || 0,
          runnerUp: t.financial?.prizeDistribution?.runnerUp || 0,
          thirdPlace: t.financial?.prizeDistribution?.thirdPlace || 0
        },
        isPublic: t.settings?.isPublic !== false,
        isActive: t.isActive !== false,
        createdBy: t.createdBy,
        updatedBy: t.updatedBy,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      };

      return NextResponse.json({ success: true, data: { tournament: normalized, auction }, message: 'Tournament and auction created successfully' }, { status: 201 });

    } catch (auctionError) {
      console.error('Error creating auction for tournament:', auctionError);
      const uiStatusMap: Record<string, string> = {
        draft: 'upcoming', registration_open: 'registration_open', registration_closed: 'upcoming',
        team_selection: 'upcoming', auction_phase: 'upcoming', active: 'active', completed: 'completed', cancelled: 'cancelled',
      };
      const t: any = tournament.toObject ? tournament.toObject() : tournament;
      const normalized = {
        _id: t._id,
        name: t.name,
        description: t.description,
        startDate: t.startDate,
        endDate: t.endDate,
        registrationStartDate: t.registrationStartDate,
        registrationEndDate: t.registrationEndDate,
        status: uiStatusMap[t.status] || t.status || 'upcoming',
        maxTeams: t.maxTeams || t.teamConfiguration?.maxTeams || body.maxTeams || 8,
        registeredTeams: Array.isArray(t.participatingTeams) ? t.participatingTeams.length : 0,
        entryFee: t.entryFee ?? t.financial?.entryFee ?? body.entryFee ?? 0,
        prizePool: t.prizePool ?? t.financial?.totalPrizePool ?? body.prizePool ?? 0,
        format: t.format,
        venue: t.venue?.name ?? t.venue ?? body.venue ?? '',
        city: t.city ?? t.venue?.city ?? body.city ?? '',
        country: t.country ?? t.venue?.country ?? body.country ?? 'India',
        organizer: t.organizer?.name ?? t.organizer ?? body.organizer ?? '',
        contactEmail: t.contactEmail ?? t.organizer?.email ?? body.contactEmail ?? '',
        contactPhone: t.contactPhone ?? t.organizer?.phone ?? body.contactPhone ?? '',
        createdBy: t.createdBy,
        updatedBy: t.updatedBy,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      };
      return NextResponse.json({ success: true, data: { tournament: normalized }, message: 'Tournament created successfully, but auction creation failed', warning: 'Auction will need to be created manually' }, { status: 201 });
    }

  } catch (error) {
    console.error('Error creating tournament:', error);
    if (error instanceof Error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to create tournament' }, { status: 500 });
  }
}
 