import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface Player {
  name: string;
  age: number;
  role: 'batsman' | 'bowler' | 'all-rounder' | 'wicket-keeper';
  battingStyle?: 'right-hand' | 'left-hand';
  bowlingStyle?: 'right-arm-fast' | 'left-arm-fast' | 'right-arm-spin' | 'left-arm-spin' | 'none';
  jerseyNumber?: number;
  contactNumber?: string;
  email?: string;
  isActive: boolean;
}

export interface Team {
  _id: string;
  name: string;
  shortName: string;
  logo?: string;
  description?: string;
  captain: Player | string;
  viceCaptain?: Player | string;
  coach?: string;
  manager?: string;
  homeGround?: {
    name: string;
    city: string;
    capacity?: number;
  } | string;
  city: string;
  state?: string;
  country: string;
  foundedYear?: number;
  contactEmail: string;
  contactPhone: string;
  website?: string;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
  players: Player[];
  tournaments: Array<{
    _id: string;
    name: string;
    status: string;
    startDate?: string;
    endDate?: string;
    format?: string;
    venue?: string;
    city?: string;
    country?: string;
  }>;
  achievements?: Array<{
    title: string;
    description?: string;
    year?: number;
  }>;
  stats?: {
    totalMatches: number;
    matchesWon: number;
    matchesLost: number;
    matchesDrawn: number;
    tournamentsPlayed: number;
    tournamentsWon: number;
    winRate: string;
    totalPoints: number;
  };
  totalMatches: number;
  matchesWon: number;
  matchesLost: number;
  matchesDrawn: number;
  points: number;
  netRunRate?: number;
  isActive: boolean;
  registrationDate: string;
  lastUpdated: string;
  winPercentage?: string;
  playerCount?: number;
  activePlayers?: Player[];
}

export interface CreateTeamData {
  name: string;
  shortName: string;
  logo?: string;
  description?: string;
  captain: Player | string; 
  viceCaptain?: Player | string;
  coach?: string;
  manager?: string;
  homeGround?: {
    name: string;
    city: string;
    capacity?: number;
  } | string;
  city: string;
  state?: string;
  country: string;
  foundedYear?: number;
  contactEmail: string;
  contactPhone: string;
  website?: string;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
  players?: Player[];
  tournaments?: string[];
  isActive?: boolean;
}

export interface TeamFilters {
  search?: string;
  city?: string;
  tournament?: string;
  status?: 'all' | 'active' | 'inactive';
  sortBy?: 'name' | 'points' | 'matches' | 'winPercentage';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface TeamPagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PlayerAction {
  action: 'addPlayer' | 'updatePlayer' | 'removePlayer';
  playerName?: string;
  name?: string;
  age?: number;
  role?: Player['role'];
  battingStyle?: Player['battingStyle'];
  bowlingStyle?: Player['bowlingStyle'];
  jerseyNumber?: number;
  contactNumber?: string;
  email?: string;
}

export interface StatsAction {
  action: 'updateStats';
  matchesWon: number;
  matchesLost: number;
  matchesDrawn: number;
  points: number;
  netRunRate?: number;
}

export interface TournamentAction {
  action: 'joinTournament' | 'leaveTournament';
  tournamentId: string;
}

export interface StatusAction {
  action: 'updateStatus';
  isActive: boolean;
}

export type TeamAction = PlayerAction | StatsAction | TournamentAction | StatusAction;

export const useTeams = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<TeamPagination>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

  const fetchTeams = useCallback(async (filters: TeamFilters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.city) params.append('city', filters.city);
      if (filters.tournament) params.append('tournament', filters.tournament);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const response = await fetch(`/api/teams?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch teams');
      }

      setTeams(data.data);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeam = useCallback(async (id: string): Promise<Team | null> => {
    try {
      const response = await fetch(`/api/teams/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch team');
      }

      return data.data;
    } catch (err: any) {
      toast.error(err.message);
      return null;
    }
  }, []);

  const createTeam = useCallback(async (teamData: CreateTeamData): Promise<Team | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teamData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create team');
      }

      toast.success(data.message || 'Team created successfully');
      
      // Refresh teams list
      await fetchTeams();
      
      return data.data;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchTeams]);

  const updateTeam = useCallback(async (id: string, teamData: Partial<CreateTeamData>): Promise<Team | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/teams/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teamData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update team');
      }

      toast.success(data.message || 'Team updated successfully');
      
      // Refresh teams list
      await fetchTeams();
      
      return data.data;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchTeams]);

  const deleteTeam = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/teams/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete team');
      }

      toast.success(data.message || 'Team deleted successfully');
      
      // Refresh teams list
      await fetchTeams();
      
      return true;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchTeams]);

  const updateTeamAction = useCallback(async (id: string, actionData: TeamAction): Promise<Team | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/teams/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(actionData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update team');
      }

      toast.success(data.message || 'Team updated successfully');
      
      // Refresh teams list
      await fetchTeams();
      
      return data.data;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchTeams]);

  // Convenience methods for specific actions
  const addPlayer = useCallback((teamId: string, playerData: Omit<Player, 'isActive'>) => {
    return updateTeamAction(teamId, { action: 'addPlayer', ...playerData });
  }, [updateTeamAction]);

  const updatePlayer = useCallback((teamId: string, playerName: string, playerData: Partial<Player>) => {
    return updateTeamAction(teamId, { action: 'updatePlayer', playerName, ...playerData });
  }, [updateTeamAction]);

  const removePlayer = useCallback((teamId: string, playerName: string) => {
    return updateTeamAction(teamId, { action: 'removePlayer', playerName });
  }, [updateTeamAction]);

  const updateTeamStats = useCallback((teamId: string, stats: Omit<StatsAction, 'action'>) => {
    return updateTeamAction(teamId, { action: 'updateStats', ...stats });
  }, [updateTeamAction]);

  const joinTournament = useCallback((teamId: string, tournamentId: string) => {
    return updateTeamAction(teamId, { action: 'joinTournament', tournamentId });
  }, [updateTeamAction]);

  const leaveTournament = useCallback((teamId: string, tournamentId: string) => {
    return updateTeamAction(teamId, { action: 'leaveTournament', tournamentId });
  }, [updateTeamAction]);

  const updateTeamStatus = useCallback((teamId: string, isActive: boolean) => {
    return updateTeamAction(teamId, { action: 'updateStatus', isActive });
  }, [updateTeamAction]);

  return {
    teams,
    loading,
    error,
    pagination,
    fetchTeams,
    fetchTeam,
    createTeam,
    updateTeam,
    deleteTeam,
    updateTeamAction,
    addPlayer,
    updatePlayer,
    removePlayer,
    updateTeamStats,
    joinTournament,
    leaveTournament,
    updateTeamStatus
  };
}; 