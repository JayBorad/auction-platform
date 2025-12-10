'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Users, 
  Shield, 
  DollarSign,
  ChevronLeft, 
  ChevronRight,
  Filter,
  Trophy,
  Target,
  User,
  Flag
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDebounce } from '@/hooks/useDebounce';

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

export default function TeamOwnerTeamsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('all');
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  
  const router = useRouter();
  
  const debouncedSearchTerm = useDebounce(searchTerm, 1000);

  // Memoized filtered players
  const filteredPlayers = useMemo(() => {
    let filtered = players;
    
    if (searchTerm) {
      filtered = filtered.filter(player => 
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (player.nationality && player.nationality.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (player.team?.name && player.team.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (roleFilter !== 'all') {
      filtered = filtered.filter(player => player.role === roleFilter);
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(player => player.status === statusFilter);
    }
    
    return filtered;
  }, [players, debouncedSearchTerm, roleFilter, statusFilter]);

  // Fetch players with memoized callback
  const fetchPlayers = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build API URL with query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(selectedTournament !== 'all' && { tournamentId: selectedTournament })
      });
      
      const response = await fetch(`/api/tournaments/team-owner/players?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        setPlayers(result.data.players || []);
        setStats(result.data.stats || null);
        setPagination(result.data.pagination);
        // Update tournaments from the API response (filtered by user's team participation)
        if (result.data.tournaments) {
          setTournaments(result.data.tournaments);
        }
      } else {
        setPlayers([]);
        setStats({
          totalPlayers: 0,
          playersByRole: { batsman: 0, 'wicket-keeper': 0 },
          totalValue: 0,
          averagePrice: 0
        });
      }
      
    } catch (error) {
      console.error('Error fetching players:', error);
      toast.error('Failed to load players');
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, roleFilter, statusFilter, selectedTournament]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sold': return 'bg-green-500';
      case 'available': return 'bg-blue-500';
      case 'unsold': return 'bg-gray-500';
      case 'retained': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'batsman': return 'bg-orange-500';
      case 'bowler': return 'bg-red-500';
      case 'all-rounder': return 'bg-purple-500';
      case 'wicket-keeper': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  // Convert stats to display format
  const statsData = stats ? [
    { 
      title: 'Total Players', 
      value: stats.totalPlayers, 
      icon: <Users className="w-6 h-6" />, 
      color: 'from-blue-600 to-blue-400',
      trend: `in ${selectedTournament === 'all' ? 'participating tournaments' : 'selected tournament'}`,
      subtitle: 'in your team'
    },
    { 
      title: 'Batsmen', 
      value: stats.playersByRole.batsman || 0, 
      icon: <Target className="w-6 h-6" />, 
      color: 'from-orange-600 to-orange-400',
      trend: `${stats.playersByRole.batsman || 0}/${stats.totalPlayers}`,
      subtitle: 'batsmen'
    },
    { 
      title: 'Bowlers', 
      value: stats.playersByRole.bowler || 0, 
      icon: <Shield className="w-6 h-6" />, 
      color: 'from-red-600 to-red-400',
      trend: `${stats.playersByRole.bowler || 0}/${stats.totalPlayers}`,
      subtitle: 'bowlers'
    },
    { 
      title: 'Total Value', 
      value: formatCurrency(stats.totalValue), 
      icon: <DollarSign className="w-6 h-6" />, 
      color: 'from-green-600 to-green-400',
      trend: `avg ${formatCurrency(stats.averagePrice)}`,
      subtitle: 'invested'
    }
  ] : [];

  if (loading) {
    return (
      <motion.div 
        className="space-y-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 backdrop-blur-md animate-pulse">
          <div className="h-8 bg-gray-700/50 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-700/50 rounded w-32"></div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 rounded-2xl animate-pulse"></div>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-80 bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div 
        className="p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 backdrop-blur-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-white to-gray-400 text-transparent bg-clip-text">
              My Team Players
            </h1>
            <p className="text-gray-400 mt-1">View your team's players acquired through auctions in tournaments where your team participates</p>
          </div>
          <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">
            Tournament View
          </Badge>
        </div>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <motion.div 
          className="grid gap-6 md:grid-cols-2 xl:grid-cols-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {statsData.map((stat, index) => (
            <motion.div 
              key={stat.title} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
            >
              <Card className="border-gray-700/50 bg-gradient-to-br from-gray-900/80 to-gray-800/80 shadow-lg h-full backdrop-blur-sm overflow-hidden hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-400">{stat.title}</p>
                      <p className="text-2xl font-bold mt-1 text-white">{stat.value}</p>
                      <div className="flex items-center mt-2 text-xs">
                        <span className="text-green-400 font-medium">{stat.trend}</span>
                        <span className="text-gray-500 ml-1">{stat.subtitle}</span>
                      </div>
                    </div>
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                      {stat.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Search and Filter */}
      <motion.div 
        className="flex flex-wrap flex-row gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <div className="relative flex-1 min-w-32">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search players, teams, or nationality..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800/50 border-gray-700/50 text-white placeholder-gray-400 backdrop-blur-sm"
          />
        </div>
        
        <Select value={selectedTournament} onValueChange={setSelectedTournament}>
          <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white backdrop-blur-sm w-full sm:w-48">
            <Trophy className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Select Tournament" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all">All Tournaments</SelectItem>
            {tournaments.map((tournament) => (
              <SelectItem key={tournament._id} value={tournament._id}>
                {tournament.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white backdrop-blur-sm w-full sm:w-40">
            <User className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="batsman">Batsman</SelectItem>
            <SelectItem value="bowler">Bowler</SelectItem>
            <SelectItem value="all-rounder">All Rounder</SelectItem>
            <SelectItem value="wicket-keeper">Wicket Keeper</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white backdrop-blur-sm w-full sm:w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="unsold">Unsold</SelectItem>
            <SelectItem value="retained">Retained</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Players Table */}
      <Card>
        <CardHeader>
          <CardTitle>My Team Players</CardTitle>
          <CardDescription>
            A list of your team's players acquired through auctions in tournaments where your team participates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Nationality</TableHead>
                <TableHead>Base Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlayers.map((player) => (
                <TableRow key={player._id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={player.image} />
                        <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{player.name}</div>
                        <div className="text-sm text-gray-500">Age: {player.age}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getRoleColor(player.role)} text-white`}>
                      {player.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {player.team ? (
                      <div className="flex items-center space-x-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={player.team.logo} />
                          <AvatarFallback>{player.team.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{player.team.name}</div>
                          <div className="text-sm text-gray-500">{player.team.city}</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500">No team</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Flag className="w-4 h-4 text-gray-400" />
                      <span>{player.nationality}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{formatCurrency(player.basePrice)}</div>
                    {player.battingHand && (
                      <div className="text-sm text-gray-500">
                        {player.battingHand} hand
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(player.status)} text-white`}>
                      {player.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/team-owner/players/${player._id}`)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <motion.div 
          className="flex justify-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.0 }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={currentPage === page 
                    ? "bg-blue-600 hover:bg-blue-700" 
                    : "border-gray-600 text-gray-300 hover:bg-gray-700"
                  }
                >
                  {page}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
            disabled={currentPage === pagination.totalPages}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </motion.div>
      )}
    </div>
  );
} 