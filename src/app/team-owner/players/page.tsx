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
  User, 
  Trophy, 
  Target, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Star,
  MapPin,
  Calendar,
  DollarSign
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency } from '@/lib/format';

interface Player {
  _id: string;
  name: string;
  role: 'batsman' | 'bowler' | 'all-rounder' | 'wicket-keeper';
  status: 'available' | 'sold' | 'unsold' | 'injured' | 'retired';
  basePrice: number;
  currentPrice?: number;
  nationality: string;
  age: number;
  experience: number;
  team?: {
    _id: string;
    name: string;
  };
  stats?: {
    matches: number;
    runs?: number;
    wickets?: number;
    average?: number;
    strikeRate?: number;
  };
  image?: string;
}

interface PlayerStats {
  totalPlayers: number;
  availablePlayers: number;
  soldPlayers: number;
  averagePrice: number;
}

export default function TeamOwnerPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  
  const router = useRouter();

  const debouncedSearchPlayer = useDebounce(searchTerm, 500);

  // Memoized filtered players
  const filteredPlayers = useMemo(() => {
    let filtered = players;
    
    if (searchTerm) {
      filtered = filtered.filter(player => 
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.nationality.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (roleFilter !== 'all') {
      filtered = filtered.filter(player => player.role === roleFilter);
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(player => player.status === statusFilter);
    }
    
    return filtered;
  }, [players, debouncedSearchPlayer, roleFilter, statusFilter]);

  // Fetch players with memoized callback
  const fetchPlayers = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build API URL with query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        ...(debouncedSearchPlayer && { search: debouncedSearchPlayer }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(roleFilter !== 'all' && { role: roleFilter })
      });
      
      const response = await fetch(`/api/players/team-owner?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        setPlayers(result.data || []);
        setStats({
          totalPlayers: result.pagination?.totalCount || 0,
          availablePlayers: result.data?.filter((p: Player) => p.status === 'available').length || 0,
          soldPlayers: result.data?.filter((p: Player) => p.status === 'sold').length || 0,
          averagePrice: result.data?.reduce((sum: number, p: Player) => sum + p.basePrice, 0) / (result.data?.length || 1) || 0
        });
        setPagination(result.pagination);
      } else {
        setPlayers([])
        setStats({
          totalPlayers: 0,
          availablePlayers: 0,
          soldPlayers: 0,
          averagePrice: 0
        });
      }
    } catch (error) {
      console.error('Error fetching players:', error);
      toast.error('Failed to load players');
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchPlayer, roleFilter, statusFilter]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'sold': return 'bg-blue-500';
      case 'unsold': return 'bg-gray-500';
      case 'injured': return 'bg-yellow-500';
      case 'retired': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'batsman': return 'from-blue-600 to-blue-400';
      case 'bowler': return 'from-red-600 to-red-400';
      case 'all-rounder': return 'from-purple-600 to-purple-400';
      case 'wicket-keeper': return 'from-green-600 to-green-400';
      default: return 'from-gray-600 to-gray-400';
    }
  };

  // Convert stats to display format
  const statsData = stats ? [
    { 
      title: 'Total Players', 
      value: stats.totalPlayers, 
      icon: <User className="w-6 h-6" />, 
      color: 'from-blue-600 to-blue-400',
      trend: '+25 this season',
      subtitle: 'registered'
    },
    { 
      title: 'Available', 
      value: stats.availablePlayers, 
      icon: <Target className="w-6 h-6" />, 
      color: 'from-green-600 to-green-400',
      trend: 'for auction',
      subtitle: 'players'
    },
    { 
      title: 'Sold Players', 
      value: stats.soldPlayers, 
      icon: <Trophy className="w-6 h-6" />, 
      color: 'from-purple-600 to-purple-400',
      trend: `${((stats.soldPlayers / stats.totalPlayers) * 100).toFixed(1)}%`,
      subtitle: 'success rate'
    },
    { 
      title: 'Average Price', 
      value: formatCurrency(stats.averagePrice), 
      icon: <DollarSign className="w-6 h-6" />, 
      color: 'from-amber-600 to-amber-400',
      trend: '+12.5%',
      subtitle: 'market value'
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
            <div key={i} className="h-96 bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 rounded-2xl animate-pulse"></div>
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
              Players Database
            </h1>
            <p className="text-gray-400 mt-1">Browse cricket players and their performance statistics</p>
          </div>
          <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">
            Read Only Access
          </Badge>
        </div>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <motion.div 
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
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
        className="flex flex-col sm:flex-row gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search players or nationality..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800/50 border-gray-700/50 text-white placeholder-gray-400 backdrop-blur-sm"
          />
        </div>
        
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white backdrop-blur-sm w-full sm:w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="batsman">Batsman</SelectItem>
            <SelectItem value="bowler">Bowler</SelectItem>
            <SelectItem value="all-rounder">All-rounder</SelectItem>
            <SelectItem value="wicket-keeper">Wicket-keeper</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white backdrop-blur-sm w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            {/* <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="unsold">Unsold</SelectItem> */}
            <SelectItem value="injured">Injured</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Players Grid */}
      <motion.div 
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        {filteredPlayers.length === 0 ? (
          <motion.div 
            className="col-span-full text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <User className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No Players Found</h3>
            <p className="text-gray-500">
              {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your search filters.' 
                : 'No players are currently available.'}
            </p>
          </motion.div>
        ) : (
          filteredPlayers.map((player, index) => (
            <motion.div 
              key={player._id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="border-gray-700/50 bg-gradient-to-br from-gray-900/80 to-gray-800/80 shadow-lg h-full backdrop-blur-sm overflow-hidden hover:shadow-xl transition-all duration-300 group">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border-2 border-blue-500/20">
                        <AvatarImage src={player.image} alt={player.name} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white font-bold">
                          {player.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-white text-lg group-hover:text-blue-400 transition-colors">
                          {player.name}
                        </CardTitle>
                        <CardDescription className="text-gray-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {player.nationality}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(player.status)} text-white text-xs`}>
                      {player.status}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Role Badge */}
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${getRoleColor(player.role)} text-white text-xs font-medium`}>
                      {player.role.replace('-', ' ')}
                    </div>
                  </div>
                  
                  {/* Player Stats */}
                  {player.stats && (
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-sm">Career Stats</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400" />
                          <span className="text-white font-semibold">{player.stats.matches}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {player.stats.runs && (
                          <div className="text-center">
                            <div className="text-blue-400 font-semibold">{player.stats.runs}</div>
                            <div className="text-gray-500">Runs</div>
                          </div>
                        )}
                        {player.stats.wickets && (
                          <div className="text-center">
                            <div className="text-red-400 font-semibold">{player.stats.wickets}</div>
                            <div className="text-gray-500">Wickets</div>
                          </div>
                        )}
                        {player.stats.average && (
                          <div className="text-center">
                            <div className="text-green-400 font-semibold">{player.stats.average}</div>
                            <div className="text-gray-500">Average</div>
                          </div>
                        )}
                        {player.stats.strikeRate && (
                          <div className="text-center">
                            <div className="text-purple-400 font-semibold">{player.stats.strikeRate}</div>
                            <div className="text-gray-500">Strike Rate</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Player Info */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Age</span>
                      <span className="text-white font-medium">{player.age} years</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Base Price</span>
                      <span className="text-green-400 font-medium">{formatCurrency(player.basePrice)}</span>
                    </div>
                    
                    {player.currentPrice && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Current Price</span>
                        <span className="text-yellow-400 font-medium">{formatCurrency(player.currentPrice)}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Action Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/team-owner/players/${player._id}`)}
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Profile
                  </Button>
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