import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface Auction {
  _id: string;
  name: string;
  description: string;
  tournamentId: string;
  startDate: string;
  endDate: string;
  status: 'scheduled' | 'live' | 'paused' | 'completed' | 'cancelled';
  currentRound: number;
  totalRounds: number;
  basePrice: number;
  maxBidIncrement: number;
  playerCategories: string[];
  registeredTeams: number;
  maxTeamsPerPlayer: number;
  budget: number;
  rules?: string;
  isPublic: boolean;
  isActive: boolean;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Player {
  _id: string;
  name: string;
  category: string;
  basePrice: number;
  currentPrice: number;
  status: 'available' | 'sold' | 'unsold';
  position: string;
  battingStyle?: string;
  bowlingStyle?: string;
  team?: string;
  auctionId: string;
}

export interface Bid {
  _id: string;
  auctionId: string;
  playerId: string;
  teamId: string;
  amount: number;
  timestamp: string;
  isWinning: boolean;
}

export interface AuctionFilters {
  search?: string;
  status?: string;
  tournamentId?: string;
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

export interface CreateAuctionData {
  name: string;
  description: string;
  tournamentId: string;
  startDate: string;
  endDate: string;
  basePrice: number;
  maxBidIncrement: number;
  playerCategories: string[];
  maxTeamsPerPlayer: number;
  budget: number;
  rules?: string;
  isPublic?: boolean;
}

export const useAuctions = () => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  // Fetch auctions with filters
  const fetchAuctions = useCallback(async (filters: AuctionFilters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.tournamentId) params.append('tournamentId', filters.tournamentId);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const response = await fetch(`/api/auctions?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch auctions');
      }

      setAuctions(data.data.auctions || data.data);
      setPagination(data.data.pagination || data.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch auctions';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get single auction
  const getAuction = useCallback(async (id: string): Promise<Auction> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/auctions/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch auction');
      }

      return data.data.auction || data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch auction';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create auction
  const createAuction = useCallback(async (auctionData: CreateAuctionData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auctions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(auctionData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create auction');
      }

      const newAuction = data.data.auction || data.data;
      setAuctions(prev => [newAuction, ...prev]);
      toast.success('Auction created successfully');
      
      return newAuction;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create auction';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update auction
  const updateAuction = useCallback(async (id: string, auctionData: Partial<CreateAuctionData>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/auctions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(auctionData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update auction');
      }

      setAuctions(prev => 
        prev.map(auction => 
          auction._id === id ? data.data : auction
        )
      );
      
      toast.success('Auction updated successfully');
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update auction';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete auction
  const deleteAuction = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/auctions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete auction');
      }

      setAuctions(prev => prev.filter(auction => auction._id !== id));
      toast.success('Auction deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete auction';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update auction status
  const updateAuctionStatus = useCallback(async (id: string, status: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/auctions/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update auction status');
      }

      setAuctions(prev => 
        prev.map(auction => 
          auction._id === id ? { ...auction, status: status as Auction['status'] } : auction
        )
      );
      
      toast.success('Auction status updated successfully');
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update auction status';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch players for auction
  const fetchAuctionPlayers = useCallback(async (auctionId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/auctions/${auctionId}/players`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch players');
      }

      setPlayers(data.data.players || data.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch players';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch bids for auction
  const fetchAuctionBids = useCallback(async (auctionId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/auctions/${auctionId}/bids`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch bids');
      }

      setBids(data.data.bids || data.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch bids';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Place bid
  const placeBid = useCallback(async (auctionId: string, playerId: string, amount: number) => {
    try {
      const response = await fetch(`/api/auctions/${auctionId}/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerId, amount }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to place bid');
      }

      toast.success('Bid placed successfully');
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to place bid';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  return {
    auctions,
    players,
    bids,
    loading,
    error,
    pagination,
    fetchAuctions,
    getAuction,
    createAuction,
    updateAuction,
    deleteAuction,
    updateAuctionStatus,
    fetchAuctionPlayers,
    fetchAuctionBids,
    placeBid,
  };
}; 