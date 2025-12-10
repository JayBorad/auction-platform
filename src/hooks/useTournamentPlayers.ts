import { useState, useEffect, useCallback } from 'react';

interface Player {
  _id: string;
  name: string;
  role: string;
  basePrice: number;
  image?: string;
  nationality: string;
  age: number;
  battingHand?: string;
  bowlingHand?: string;
  team?: {
    _id: string;
    name: string;
    logo?: string;
    city: string;
  };
  status: string;
  auctionHistory?: Array<{
    auction: string;
    status: string;
    soldPrice?: number;
    soldTo?: string;
  }>;
}

interface Tournament {
  _id: string;
  name: string;
  description?: string;
  status: string;
  startDate: string;
  endDate: string;
  format: string;
}

interface PlayerStats {
  totalPlayers: number;
  playersByRole: Record<string, number>;
  totalValue: number;
  averagePrice: number;
}

interface UseTournamentPlayersOptions {
  tournamentId?: string;
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}

interface UseTournamentPlayersReturn {
  players: Player[];
  tournaments: Tournament[];
  stats: PlayerStats | null;
  loading: boolean;
  error: string | null;
  pagination: any;
  refetch: () => void;
}

export function useTournamentPlayers(options: UseTournamentPlayersOptions = {}): UseTournamentPlayersReturn {
  const [players, setPlayers] = useState<Player[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>(null);

  const fetchTournaments = useCallback(async () => {
    try {
      const response = await fetch('/api/tournaments/team-owner');
      if (response.ok) {
        const result = await response.json();
        setTournaments(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching tournaments:', err);
    }
  }, []);

  const fetchPlayers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: (options.page || 1).toString(),
        limit: (options.limit || 20).toString(),
        ...(options.search && { search: options.search }),
        ...(options.role && options.role !== 'all' && { role: options.role }),
        ...(options.status && options.status !== 'all' && { status: options.status }),
        ...(options.tournamentId && options.tournamentId !== 'all' && { tournamentId: options.tournamentId })
      });

      const response = await fetch(`/api/tournaments/team-owner/players?${params}`);

      if (response.ok) {
        const result = await response.json();
        setPlayers(result.data.players || []);
        setStats(result.data.stats || null);
        setPagination(result.data.pagination);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch players');
      }
    } catch (err) {
      setError('Failed to fetch players');
      console.error('Error fetching players:', err);
    } finally {
      setLoading(false);
    }
  }, [options.tournamentId, options.page, options.limit, options.search, options.role, options.status]);

  const refetch = useCallback(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  return {
    players,
    tournaments,
    stats,
    loading,
    error,
    pagination,
    refetch
  };
}
