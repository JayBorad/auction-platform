'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Trophy, 
  Calendar, 
  Users, 
  DollarSign, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  MapPin,
  Star,
  Clock,
  Target
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface Team {
  _id: string;
  name: string;
  logo?: string;
  city: string;
  owner: string;
}

interface Player {
  _id: string;
  name: string;
  role: string;
  basePrice: number;
  image?: string;
  nationality: string;
  age: number;
}

interface TeamEntry {
  _id: string;
  team: Team;
  budget: {
    total: number;
    used: number;
    remaining: number;
  };
}

interface PlayerEntry {
  _id: string;
  player: Player;
  basePrice: number;
  category: string;
  status: string;
}

interface Tournament {
  _id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  participatingTeams: TeamEntry[];
  playerPool: {
    totalPlayers: number;
    availablePlayers: PlayerEntry[];
    soldPlayers: PlayerEntry[];
  };
}

interface TournamentStats {
  totalTournaments: number;
  activeTournaments: number;
  totalPrizePool: number;
  myParticipations: number;
}

export default function TeamOwnerTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [stats, setStats] = useState<TournamentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  
  const router = useRouter();

  // Debounced search term for API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Memoized filtered tournaments
  const filteredTournaments = useMemo(() => {
    let filtered = tournaments;
    
    if (searchTerm) {
      filtered = filtered.filter(tournament => 
        tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tournament.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tournament => tournament.status === statusFilter);
    }
    
    return filtered;
  }, [tournaments, debouncedSearchTerm, statusFilter]);

  // Fetch tournaments with memoized callback
  const fetchTournaments = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build API URL with query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });
      
      const response = await fetch(`/api/tournaments/team-owner?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        setTournaments(result.data || []);
        setStats({
          totalTournaments: result.pagination?.totalCount || 0,
          activeTournaments: result.data?.filter((t: Tournament) => t.status === 'active').length || 0,
          totalPrizePool: result.data?.reduce((sum: number, t: Tournament) => sum + ((t as any)?.financial?.totalPrizePool || 0), 0) || 0,
          myParticipations: result.data?.filter((t: Tournament) => t.status !== 'cancelled').length || 0
        });
        setPagination(result.pagination);
      } else if (response.status === 401) {
        toast.error('Unauthorized access');
        return;
      } else {
        // Fallback to empty data if API fails
        setTournaments([]);
        setStats({
          totalTournaments: 0,
          activeTournaments: 0,
          totalPrizePool: 0,
          myParticipations: 0
        });
      }
      
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      toast.error('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, statusFilter]);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'upcoming': return 'bg-blue-500';
      case 'completed': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="h-3 w-3" />;
      case 'upcoming': return <Calendar className="h-3 w-3" />;
      case 'completed': return <Trophy className="h-3 w-3" />;
      case 'cancelled': return <Target className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  // Convert stats to display format
  const statsData = stats ? [
    { 
      title: 'My Tournaments', 
      value: stats.totalTournaments, 
      icon: <Trophy className="w-6 h-6" />, 
      color: 'from-blue-600 to-blue-400',
      trend: 'participating',
      subtitle: 'tournaments'
    },
    { 
      title: 'Active Now', 
      value: stats.activeTournaments, 
      icon: <Clock className="w-6 h-6" />, 
      color: 'from-green-600 to-green-400',
      trend: 'ongoing',
      subtitle: 'tournaments'
    },
    { 
      title: 'My Participations', 
      value: stats.myParticipations, 
      icon: <Users className="w-6 h-6" />, 
      color: 'from-purple-600 to-purple-400',
      trend: 'this season',
      subtitle: 'joined'
    },
    { 
      title: 'Total Prize Pool', 
      value: formatCurrency(stats.totalPrizePool), 
      icon: <DollarSign className="w-6 h-6" />, 
      color: 'from-amber-600 to-amber-400',
      trend: '+25%',
      subtitle: 'value'
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
        className="p-4 sm:p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 backdrop-blur-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-br from-white to-gray-400 text-transparent bg-clip-text">
              Tournaments Hub
            </h1>
            <p className="text-gray-400 mt-1">Discover and participate in cricket tournaments worldwide</p>
          </div>
          <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">
            Read Only Access
          </Badge>
        </div>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <motion.div 
          className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4"
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
                      {/* <div className="flex items-center mt-2 text-xs">
                        <span className="text-green-400 font-medium">{stat.trend}</span>
                        <span className="text-gray-500 ml-1">{stat.subtitle}</span>
                      </div> */}
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
        className="flex flex-col sm:flex-row gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search tournaments, descriptions, or locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800/50 border-gray-700/50 text-white placeholder-gray-400 backdrop-blur-sm"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white backdrop-blur-sm w-full sm:w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Tournaments Grid */}
      <motion.div 
        className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        {filteredTournaments.length === 0 ? (
          <motion.div 
            className="col-span-full text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No Tournaments Found</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search filters.' 
                : 'No tournaments are currently available.'}
            </p>
          </motion.div>
        ) : (
          filteredTournaments.map((tournament, index) => (
            <motion.div 
              key={tournament._id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="border-gray-700/50 bg-gradient-to-br from-gray-900/80 to-gray-800/80 shadow-lg h-full backdrop-blur-sm overflow-hidden hover:shadow-xl transition-all duration-300 group">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border-2 border-blue-500/20">
                        <AvatarImage src={tournament.participatingTeams[0]?.team?.logo} alt={tournament.name} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white font-bold">
                          {tournament.participatingTeams[0]?.team?.name?.[0] || 'T'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-white text-lg group-hover:text-blue-400 transition-colors">
                          {tournament.name}
                        </CardTitle>
                        <CardDescription className="text-gray-400 flex items-center gap-1">
                          {tournament.description}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(tournament.status)} text-white text-xs flex items-center gap-1`}>
                      {getStatusIcon(tournament.status)}
                      {tournament.status}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Tournament Details */}
                  <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">Participating Teams</span>
                      <span className="text-white font-medium">{tournament.participatingTeams.length}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">Player Pool</span>
                      <span className="text-white font-medium">{tournament?.playerPool?.totalPlayers}</span>
                    </div>
                  </div>
                  
                  {/* Teams Section */}
                  <div>
                    <h3 className="text-lg font-medium mb-2">Participating Teams</h3>
                    <div className="space-y-2">
                      {tournament.participatingTeams.map((teamEntry) => (
                        <div key={teamEntry._id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                          <div className="flex items-center gap-2">
                            <Avatar>
                              <AvatarImage src={teamEntry.team?.logo} />
                              <AvatarFallback>{teamEntry.team?.name?.[0] || 'T'}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{teamEntry.team?.name || 'Unknown Team'}</p>
                              <p className="text-sm text-gray-400">
                                Budget: {formatCurrency(teamEntry.budget?.remaining || 0)} remaining
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Players Section */}
                  <div>
                    <h3 className="text-lg font-medium mb-2">Available Players</h3>
                    <div className="space-y-2">
                      {tournament.playerPool?.availablePlayers?.slice(0, 3).map((playerEntry) => (
                        <div key={playerEntry._id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                          <div className="flex items-center gap-2">
                            <Avatar>
                              <AvatarImage src={playerEntry.player?.image} />
                              <AvatarFallback>
                                {playerEntry.player?.name ? playerEntry.player.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'P'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{playerEntry.player?.name || 'Unknown Player'}</p>
                              <p className="text-sm text-gray-400">
                                {playerEntry.player?.role || 'Unknown Role'} | Base Price: {formatCurrency(playerEntry.basePrice || playerEntry.player?.basePrice || 0)}
                              </p>
                            </div>
                          </div>
                          <Badge>{playerEntry.category}</Badge>
                        </div>
                      ))}
                      {tournament.playerPool?.availablePlayers?.length > 3 && (
                        <Button variant="outline" className="w-full" onClick={() => router.push(`/team-owner/tournaments/${tournament._id}`)}>
                          View All Players ({tournament.playerPool.availablePlayers.length})
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/team-owner/tournaments/${tournament._id}`)}
                      className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </motion.div>

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