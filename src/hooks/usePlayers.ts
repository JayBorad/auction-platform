import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface Player {
  _id: string;
  name: string;
  age: number;
  role: string;
  battingHand: 'Left' | 'Right';
  bowlingHand: 'Left' | 'Right' | null;
  basePrice: number;
  soldPrice?: number;
  nationality: string;
  team?: string;
  status: 'available' | 'sold' | 'unsold' | 'injured' | 'retired';
  tournaments?: string[];
  image?: string;
  battingStrikeRate?: number;
  runs?: number;
  highestScore?: number;
  bowlingStrikeRate?: number;
  bowlingAverage?: number;
  economy?: number;
  wickets?: number;
  bestBowlingStats?: string;
  ipl2025Team?: string;
  recentForm?: 'excellent' | 'good' | 'average' | 'poor';
  marketValue?: number;
  rating?: number;
  suggestedPrice?: number;
  createdAt: string;
  updatedAt: string;
  auctionHistory?: Array<{
    auction: string;
    finalPrice: number;
    winner: string;
    status: string;
    year: number;
  }>;
}

export interface PlayerFilters {
  search?: string;
  role?: string; // Changed from position to role
  status?: string;
  nationality?: string;
  tournamentId?: string;
  team?: string;
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

export interface CreatePlayerData {
  name: string;
  age: number;
  role: string;
  battingHand: string;
  bowlingHand?: string | null;
  basePrice: number;
  nationality: string;
  image?: string;
  battingStrikeRate?: number;
  runs?: number;
  highestScore?: number;
  bowlingStrikeRate?: number;
  bowlingAverage?: number;
  economy?: number;
  wickets?: number;
  bestBowlingStats?: string;
  recentForm?: string;
  marketValue?: number;
}

export const usePlayers = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  // Fetch players with filters
  const fetchPlayers = useCallback(async (filters: PlayerFilters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.role) params.append('role', filters.role);
      if (filters.status) params.append('status', filters.status);
      if (filters.nationality) params.append('nationality', filters.nationality);
      if (filters.tournamentId) params.append('tournamentId', filters.tournamentId);
      if (filters.team) params.append('team', filters.team);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const response = await fetch(`/api/players?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch players');
      }

      setPlayers(data.data.players || data.data);
      setPagination(data.data.pagination || data.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch players';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get single player
  const getPlayer = useCallback(async (id: string): Promise<Player> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/players/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch player');
      }

      return data.data.player || data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch player';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create player
  const createPlayer = useCallback(async (playerData: CreatePlayerData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(playerData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create player');
      }

      const newPlayer = data.data.player || data.data;
      setPlayers(prev => [newPlayer, ...prev]);
      toast.success('Player created successfully');
      
      return newPlayer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create player';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update player
  const updatePlayer = useCallback(async (id: string, playerData: Partial<CreatePlayerData>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/players/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(playerData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update player');
      }

      setPlayers(prev => 
        prev.map(player => 
          player._id === id ? data.data.player : player
        )
      );
      
      toast.success('Player updated successfully');
      return data.data.player;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update player';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete player
  const deletePlayer = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/players/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete player');
      }

      setPlayers(prev => prev.filter(player => player._id !== id));
      toast.success('Player deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete player';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update player status
  const updatePlayerStatus = useCallback(async (id: string, status: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/players/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update player status');
      }

      setPlayers(prev => 
        prev.map(player => 
          player._id === id ? { ...player, status: status as Player['status'] } : player
        )
      );
      
      toast.success('Player status updated successfully');
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update player status';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Assign player to team
  const assignPlayerToTeam = useCallback(async (playerId: string, teamId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/players/${playerId}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign player to team');
      }

      setPlayers(prev => 
        prev.map(player => 
          player._id === playerId ? { ...player, team: teamId, status: 'sold' } : player
        )
      );
      
      toast.success('Player assigned to team successfully');
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign player to team';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Release player from team
  const releasePlayer = useCallback(async (playerId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/players/${playerId}/release`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to release player');
      }

      setPlayers(prev => 
        prev.map(player => 
          player._id === playerId ? { ...player, team: undefined, status: 'available' } : player
        )
      );
      
      toast.success('Player released successfully');
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to release player';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    players,
    loading,
    error,
    pagination,
    fetchPlayers,
    getPlayer,
    createPlayer,
    updatePlayer,
    deletePlayer,
    updatePlayerStatus,
    assignPlayerToTeam,
    releasePlayer,
  };
}; 