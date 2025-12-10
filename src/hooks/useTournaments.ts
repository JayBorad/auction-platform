import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface Tournament {
  _id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled' | 'registration_open' | 'registration_closed' | 'auction_phase';
  maxTeams: number;
  registeredTeams: number;
  entryFee: number;
  prizePool: number;
  format: 'T20' | 'ODI' | 'Test' | 'T10' | 'The Hundred';
  venue: string;
  city: string;
  country: string;
  organizer: string;
  contactEmail: string;
  contactPhone: string;
  rules?: string;
  prizes: {
    winner: number;
    runnerUp: number;
    thirdPlace: number;
  };
  isPublic: boolean;
  isActive: boolean;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  
  // Extended properties for tournament management
  participatingTeams?: Array<{
    team: string;
    registrationDate: string;
    status: string;
    budget: {
      total: number;
      used: number;
      remaining: number;
    };
    squadPlayers: Array<any>;
    teamStats: {
      matchesPlayed: number;
      matchesWon: number;
      matchesLost: number;
      matchesTied: number;
      points: number;
    };
    _id: string;
  }>;
  
  playerPool?: {
    totalPlayers: number;
    availablePlayers: Array<{
      player: string;
      basePrice: number;
      category: string;
      addedDate: string;
      status: string;
      _id: string;
    }>;
    soldPlayers: Array<any>;
    unsoldPlayers: Array<any>;
  };
  
  teamConfiguration?: {
    maxTeams: number;
    minPlayersPerTeam: number;
    maxPlayersPerTeam: number;
    maxForeignPlayers: number;
    captainRequired: boolean;
    wicketKeeperRequired: boolean;
  };
  
  financial?: {
    totalBudget: number;
    entryFee: number;
    prizeDistribution: {
      winner: number;
      runnerUp: number;
      thirdPlace: number;
      fourthPlace: number;
      others: number;
    };
  };
  
  settings?: {
    auctionSettings: {
      bidIncrement: number;
      timePerBid: number;
      maxBidsPerPlayer: number;
      rtmpEnabled: boolean;
    };
  };
  
  auctions?: Array<any>;
}

export interface TournamentFilters {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface CreateTournamentData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  maxTeams: number;
  entryFee: number;
  prizePool: number;
  format: string;
  venue: string;
  city: string;
  country?: string;
  organizer: string;
  contactEmail: string;
  contactPhone: string;
  rules?: string;
  prizes?: {
    winner: number;
    runnerUp: number;
    thirdPlace: number;
  };
  isPublic?: boolean;
}

export const useTournaments = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  // Fetch tournaments with filters
  const fetchTournaments = useCallback(async (filters: TournamentFilters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const response = await fetch(`/api/tournaments?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tournaments');
      }

      setTournaments(data.data.tournaments || data.data);
      setPagination(data.data.pagination || data.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tournaments';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create tournament
  const createTournament = useCallback(async (tournamentData: CreateTournamentData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tournamentData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create tournament');
      }

      // Add the new tournament to the list
      const newTournament = data.data.tournament || data.data;
      setTournaments(prev => [newTournament, ...prev]);
      toast.success('Tournament created successfully');
      
      return newTournament;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create tournament';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update tournament
  const updateTournament = useCallback(async (id: string, tournamentData: Partial<CreateTournamentData>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tournaments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tournamentData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update tournament');
      }

      // Update the tournament in the list
      setTournaments(prev => 
        prev.map(tournament => 
          tournament._id === id ? data.data : tournament
        )
      );
      
      toast.success('Tournament updated successfully');
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update tournament';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete tournament
  const deleteTournament = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tournaments/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete tournament');
      }

      // Remove the tournament from the list
      setTournaments(prev => prev.filter(tournament => tournament._id !== id));
      toast.success('Tournament deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete tournament';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update tournament status
  const updateTournamentStatus = useCallback(async (id: string, status: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tournaments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update tournament status');
      }

      // Update the tournament in the list
      setTournaments(prev => 
        prev.map(tournament => 
          tournament._id === id ? data.data : tournament
        )
      );
      
      toast.success('Tournament status updated successfully');
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update tournament status';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get single tournament
  const getTournament = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      // Add timestamp to force fresh data fetching
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/tournaments/${id}?t=${timestamp}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tournament');
      }

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tournament';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    tournaments,
    loading,
    error,
    pagination,
    fetchTournaments,
    createTournament,
    updateTournament,
    deleteTournament,
    updateTournamentStatus,
    getTournament,
  };
}; 