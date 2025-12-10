'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Gavel, 
  Clock, 
  Users, 
  Eye, 
  Calendar,
  Trophy,
  Play,
  Pause,
  AlertCircle,
  TrendingUp,
  Timer,
  Filter,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { useDebounce } from '@/hooks/useDebounce';
import WebSocketManager from '@/lib/websocket';

interface Auction {
  _id: string;
  name: string;
  tournament: {
    _id: string;
    name: string;
  };
  status: 'upcoming' | 'live' | 'paused' | 'completed' | 'cancelled';
  startDate: string;
  endDate?: string;
  participants: number;
  currentPlayer?: {
    _id: string;
    name: string;
    role: string;
    basePrice: number;
    currentBid?: number;
  };
  totalPlayers: number;
  soldPlayers: number;
  budget: number;
  description?: string;
}

interface AuctionStats {
  totalAuctions: number;
  liveAuctions: number;
  totalRevenue: number;
  myParticipations: number;
}

export default function TeamOwnerAuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [stats, setStats] = useState<AuctionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const router = useRouter();
  const wsManager = new WebSocketManager();

  const debouncedSearchTerm = useDebounce(searchTerm, 1000);

  useEffect(() => {
    wsManager.connect();

    const handleAuctionStatusChange = (event: any) => {
      if (event.type && ['auction_started', 'auction_paused', 'auction_resumed', 'auction_ended'].includes(event.type)) {
        // Update the specific auction in the list
        setAuctions(prevAuctions => {
          return prevAuctions.map(auction => {
            if (auction._id === event.auctionId) {
              let newStatus = auction.status;
              switch (event.type) {
                case 'auction_started':
                  newStatus = 'live';
                  break;
                case 'auction_paused':
                  newStatus = 'paused';
                  break;
                case 'auction_resumed':
                  newStatus = 'live';
                  break;
                case 'auction_ended':
                  newStatus = 'completed';
                  break;
              }
              return { ...auction, status: newStatus };
            }
            return auction;
          });
        });

        // Update stats
        setStats(prevStats => {
          if (!prevStats) return prevStats;
          let newLiveAuctions = prevStats.liveAuctions;
          switch (event.type) {
            case 'auction_started':
              newLiveAuctions += 1;
              break;
            case 'auction_paused':
            case 'auction_ended':
              newLiveAuctions = Math.max(0, newLiveAuctions - 1);
              break;
            case 'auction_resumed':
              newLiveAuctions += 1;
              break;
          }
          return { ...prevStats, liveAuctions: newLiveAuctions };
        });
      }
    };

    const cleanup = wsManager.on('auction_status_changed', handleAuctionStatusChange);

    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
      wsManager.disconnect();
    };
  }, []);

  // Fetch auctions with memoized callback
  const fetchAuctions = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build API URL with query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });
      
      const response = await fetch(`/api/auctions/team-owner?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        setAuctions(result.data || []);
        setTotalItems(result.pagination?.totalItems || 0);
        setTotalPages(result.pagination?.totalPages || 1);
        setStats({
          totalAuctions: result.pagination?.totalCount || 0,
          liveAuctions: result.data?.filter((a: Auction) => a.status === 'live').length || 0,
          totalRevenue: result.data?.reduce((sum: number, a: Auction) => sum + a.budget, 0) || 0,
          myParticipations: result.data?.filter((a: Auction) => a.status !== 'cancelled').length || 0
        });
      } 
      
    } catch (error) {
      console.error('Error fetching auctions:', error);
      toast.error('Failed to load auctions');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearchTerm, statusFilter]);

  useEffect(() => {
    fetchAuctions();
  }, [fetchAuctions]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handlePageSizeChange = (newPageSize: string) => {
    const size = parseInt(newPageSize);
    setPageSize(size);
    setCurrentPage(1);
  };

  const resetPagination = () => {
    setCurrentPage(1);
  };
  
  useEffect(() => {
    resetPagination();
  }, [statusFilter, debouncedSearchTerm]);


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-500';
      case 'upcoming': return 'bg-blue-500';
      case 'paused': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'live': return <Play className="h-3 w-3" />;
      case 'upcoming': return <Clock className="h-3 w-3" />;
      case 'paused': return <Pause className="h-3 w-3" />;
      case 'completed': return <Trophy className="h-3 w-3" />;
      case 'cancelled': return <AlertCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  // Convert stats to display format
  const statsData = stats ? [
    { 
      title: 'Total Auctions', 
      value: stats.totalAuctions, 
      icon: <Gavel className="w-6 h-6" />, 
      color: 'from-blue-600 to-blue-400',
      trend: '+12%',
      subtitle: 'available'
    },
    { 
      title: 'Live Auctions', 
      value: stats.liveAuctions, 
      icon: <Timer className="w-6 h-6" />, 
      color: 'from-red-600 to-red-400',
      trend: `${stats.liveAuctions > 0 ? 'Active' : 'None'}`,
      subtitle: 'happening now'
    },
    { 
      title: 'My Participations', 
      value: stats.myParticipations, 
      icon: <Users className="w-6 h-6" />, 
      color: 'from-green-600 to-green-400',
      trend: '+3 this month',
      subtitle: 'joined auctions'
    },
    { 
      title: 'Total Value', 
      value: formatCurrency(stats.totalRevenue), 
      icon: <TrendingUp className="w-6 h-6" />, 
      color: 'from-purple-600 to-purple-400',
      trend: '+15.2%',
      subtitle: 'market size'
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
        <div className="h-96 bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 rounded-2xl animate-pulse"></div>
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
              Auction Center
            </h1>
            <p className="text-gray-400 mt-1">Participate in cricket player auctions and build your dream team</p>
          </div>
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

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Tabs defaultValue="auctions" className="space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <TabsList className="bg-gray-800/50 border border-gray-700/50 backdrop-blur-sm">
              <TabsTrigger value="auctions" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Gavel className="w-4 h-4 mr-2" />
                All Auctions
              </TabsTrigger>
              <TabsTrigger value="live" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                <Timer className="w-4 h-4 mr-2" />
                Live Now
              </TabsTrigger>
            </TabsList>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search auctions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800/50 border-gray-700/50 text-white placeholder-gray-400 backdrop-blur-sm sm:w-64"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white backdrop-blur-sm w-full sm:w-36">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="auctions" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {auctions.length === 0 ? (
                <motion.div 
                  className="col-span-full text-center py-12"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Gavel className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-400 mb-2">No Auctions Found</h3>
                  <p className="text-gray-500">Check back later for new auction opportunities.</p>
                </motion.div>
              ) : (
                auctions.map((auction, index) => (
                  <motion.div 
                    key={auction._id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className="border-gray-700/50 bg-gradient-to-br from-gray-900/80 to-gray-800/80 shadow-lg h-full backdrop-blur-sm overflow-hidden hover:shadow-xl transition-all duration-300 group">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-white text-lg group-hover:text-blue-400 transition-colors">
                              {auction.name}
                            </CardTitle>
                            <CardDescription className="text-gray-400 mt-1">
                              {auction.tournament.name}
                            </CardDescription>
                          </div>
                          <Badge className={`${getStatusColor(auction.status)} text-white shadow-md flex items-center gap-1`}>
                            {getStatusIcon(auction.status)}
                            {auction.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        {/* Current Player (if live) */}
                        {auction.status === 'live' && auction.currentPlayer && (
                          <div className="bg-blue-900/20 border border-blue-700/50 rounded-xl p-3 backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border-2 border-blue-500/20">
                                <AvatarFallback className="bg-blue-600 text-white text-xs">
                                  {auction.currentPlayer.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="text-white font-medium">{auction.currentPlayer.name}</p>
                                <p className="text-blue-400 text-sm">{auction.currentPlayer.role}</p>
                              </div>
                            </div>
                            <div className="mt-2 flex justify-between text-sm">
                              <span className="text-gray-400">Base: {formatCurrency(auction.currentPlayer.basePrice)}</span>
                              {auction.currentPlayer.currentBid && (
                                <span className="text-green-400 font-semibold">Current: {formatCurrency(auction.currentPlayer.currentBid)}</span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Auction Stats */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="text-gray-300">
                            <div className="font-medium text-gray-400">Total Players</div>
                            <div className="text-white font-semibold">{auction.totalPlayers || 0}</div>
                          </div>
                          <div className="text-gray-300">
                            <div className="font-medium text-gray-400">Sold</div>
                            <div className="text-green-400 font-semibold">{auction.soldPlayers || 0}</div>
                          </div>
                          <div className="text-gray-300">
                            <div className="font-medium text-gray-400">Budget</div>
                            <div className="text-yellow-400 font-semibold">{formatCurrency(auction.budget)}</div>
                          </div>
                          <div className="text-gray-300">
                            <div className="font-medium text-gray-400">Teams</div>
                            <div className="text-white font-semibold">{auction.participants || 0}</div>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/team-owner/auctions/${auction._id}`)}
                            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                          
                          {auction.status === 'live' && (
                            <Button
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 shadow-md"
                              onClick={() => router.push(`/team-owner/auctions/${auction._id}`)}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Join
                            </Button>
                          )}
                          
                          {/* {auction.status === 'upcoming' && (
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 shadow-md"
                              onClick={() => router.push(`/team-owner/auctions/${auction._id}`)}
                            >
                              <Calendar className="h-3 w-3 mr-1" />
                              Register
                            </Button>
                          )} */}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
              </div>
  
              {/* Pagination */}
              {totalItems > 0 && (
                <motion.div
                  className="flex flex-col lg:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-700/50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                >
                  {/* Items per page selector */}
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>Show</span>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={handlePageSizeChange}
                    >
                      <SelectTrigger className="w-20 bg-gray-800/50 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="6">6</SelectItem>
                        <SelectItem value="12">12</SelectItem>
                        <SelectItem value="24">24</SelectItem>
                        <SelectItem value="48">48</SelectItem>
                      </SelectContent>
                    </Select>
                    <span>per page</span>
                  </div>
  
                  {/* Pagination info */}
                  <div className="text-sm text-gray-400">
                    Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)} to{" "}
                    {Math.min(currentPage * pageSize, totalItems)} of {totalItems} auctions
                  </div>
  
                  {/* Page navigation */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <p className="hidden md:block">Previous</p>
                    </Button>
  
                    {/* Page numbers */}
                    <div className="flex max-md:flex-wrap max-md:justify-center items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
  
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className={`w-10 h-10 p-0 ${
                              currentPage === pageNum
                                ? "bg-blue-600 hover:bg-blue-700"
                                : "border-gray-600 text-gray-300 hover:bg-gray-700"
                            }`}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
  
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                    >
                      <p className="hidden md:block">Next</p>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </TabsContent>

          <TabsContent value="live" className="space-y-6">
            {auctions.filter(a => a.status === 'live').length > 0 ? (
              <div className="grid gap-6 lg:grid-cols-2">
                {auctions.filter(a => a.status === 'live').map((auction) => (
                  <motion.div 
                    key={auction._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card className="border-red-500/30 bg-gradient-to-br from-red-900/20 to-gray-900/80 shadow-lg backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                          {auction.name}
                          <Badge className="bg-red-500 text-white ml-auto">LIVE</Badge>
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          {auction.tournament.name}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {auction.currentPlayer && (
                          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="text-white font-medium">{auction.currentPlayer.name}</h4>
                                <p className="text-gray-400 text-sm">{auction.currentPlayer.role}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-green-400 font-bold text-lg">
                                  {formatCurrency(auction.currentPlayer.currentBid || auction.currentPlayer.basePrice)}
                                </p>
                                <p className="text-gray-400 text-sm">Current Bid</p>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button 
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                onClick={() => router.push(`/team-owner/auctions/${auction._id}`)}
                              >
                                <Gavel className="w-4 h-4 mr-2" />
                                Place Bid
                              </Button>
                              <Button 
                                variant="outline" 
                                className="border-gray-600 text-gray-300"
                                onClick={() => router.push(`/team-owner/auctions/${auction._id}`)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div 
                className="text-center py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Timer className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">No Live Auctions</h3>
                <p className="text-gray-500">Check back later when auctions go live.</p>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
} 