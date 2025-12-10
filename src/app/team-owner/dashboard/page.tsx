'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Trophy, 
  DollarSign, 
  Gavel,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Play,
  Crown,
  TrendingDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';
import { formatCurrency } from '@/lib/format';

// Define the User type for our localStorage data
type User = {
  name: string;
  role: string;
  email?: string;
};

interface DashboardData {
  stats: {
    totalPlayers: number;
    totalTournaments: number;
    totalTeams: number;
    activeAuctions: number;
    totalBudget: number;
    usedBudget: number;
    myTeamValue: number;
    myPlayersCount: number;
    winRate: number;
    ranking: number;
  };
  liveAuctions: Array<{
    _id: string;
    name: string;
    tournament: string;
    status: string;
    currentPlayer: {
      name: string;
      role: string;
      currentBid: number;
      timeLeft: number;
    };
    participants: Array<{
      team: {
        _id: string;
        name: string;
      };
      remainingBudget: number;
      playersWon: any[];
      _id: string;
    }>;
  }>;
  myTeamPlayers: Array<{
    _id: string;
    name: string;
    role: string;
    purchasePrice: number;
    currentValue: number;
    performance: 'up' | 'down' | 'stable';
    performanceChange: number;
  }>;
  upcomingMatches: Array<{
    _id: string;
    tournament: string;
    opponent: string;
    date: string;
    venue: string;
  }>;
  marketTrends: {
    hotPlayers: Array<{
      _id: string;
      name: string;
      role: string;
      trend: 'rising' | 'falling';
      priceChange: number;
      currentPrice: number;
    }>;
  };
}

export default function TeamOwnerDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Get user data from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          setUser(JSON.parse(userData));
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Separate useEffect for real-time updates to avoid dependency issues
  useEffect(() => {
    if (data?.liveAuctions?.length) {
      const interval = setInterval(() => {
        fetchDashboardDataQuiet();
      }, 10000); // Less frequent updates (10 seconds)

      return () => clearInterval(interval);
    }
  }, [data?.liveAuctions?.length]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/team-owner');
      
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      } else {
        setData(null);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Quiet fetch for real-time updates (doesn't show loading state)
  const fetchDashboardDataQuiet = async () => {
    try {
      const response = await fetch('/api/dashboard/team-owner');
      
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
      // Don't update mock data in quiet mode to avoid unnecessary re-renders
    } catch (error) {
      console.error('Error fetching dashboard data (quiet):', error);
      // Don't show toast errors for background updates
    }
  };


  // Convert stats to display format
  const statsData = data ? [
    { 
      title: 'My Team Value', 
      value: formatCurrency(data.stats.myTeamValue), 
      change: '+12.5%',
      trend: 'up' as const,
      icon: <Crown className="w-6 h-6" />, 
      color: 'from-yellow-600 to-yellow-400',
      subtitle: 'total worth'
    },
    { 
      title: 'Team Players', 
      value: data.stats.myPlayersCount.toString(), 
      change: '+2 this month',
      trend: 'up' as const,
      icon: <Users className="w-6 h-6" />, 
      color: 'from-blue-600 to-blue-400',
      subtitle: 'in squad'
    },
    { 
      title: 'Budget Used', 
      value: `${((data.stats.usedBudget / data.stats.totalBudget) * 100).toFixed(1)}%`, 
      change: formatCurrency(data.stats.usedBudget),
      trend: 'up' as const,
      icon: <DollarSign className="w-6 h-6" />, 
      color: 'from-green-600 to-green-400',
      subtitle: `of ${formatCurrency(data.stats.totalBudget)}`
    },
    { 
      title: 'Team Ranking', 
      value: `#${data.stats.ranking}`, 
      change: data.stats.winRate.toFixed(1) + '% win rate',
      trend: data.stats.ranking <= 5 ? 'up' as const : 'down' as const,
      icon: <Trophy className="w-6 h-6" />, 
      color: 'from-purple-600 to-purple-400',
      subtitle: 'league position'
    },
  ] : [];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15
      }
    }
  };

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
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-96 bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 rounded-2xl animate-pulse"></div>
          <div className="h-96 bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 rounded-2xl animate-pulse"></div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <motion.div 
        className="p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 backdrop-blur-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-white to-gray-400 text-transparent bg-clip-text">
          Team Owner Dashboard
        </h1>
        
        <div className="mt-2 flex items-center">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            {user?.role === 'team-owner' ? 'Team Owner' : 'User'}
          </span>
          {user?.name && (
            <span className="ml-3 text-gray-400">
              Welcome back, <span className="text-white font-medium">{user.name}</span>
            </span>
          )}
        </div>
        
        <p className="text-gray-400 mt-4">
          Manage your cricket team, track player performance, and participate in auctions.
        </p>
      </motion.div>

      {/* Stats Cards */}
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
                      <span className={`font-medium ${stat.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                        {stat.trend === 'up' ? <TrendingUp className="w-3 h-3 mr-1 inline" /> : <TrendingDown className="w-3 h-3 mr-1 inline" />}
                        {stat.change}
                      </span>
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

      {/* Action Cards */}
      <motion.div 
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <ActionCard
          title="Live Auctions"
          description="Participate in ongoing player auctions"
          icon={<Gavel className="w-6 h-6" />}
          href="/team-owner/auctions"
          count={data?.stats.activeAuctions || 0}
        />
        <ActionCard
          title="My Team"
          description="View and manage your team players"
          icon={<Users className="w-6 h-6" />}
          href="/team-owner/teams"
          count={data?.stats.myPlayersCount || 0}
        />
        <ActionCard
          title="Tournaments"
          description="Browse available tournaments"
          icon={<Trophy className="w-6 h-6" />}
          href="/team-owner/tournaments"
          count={data?.stats.totalTournaments || 0}
        />
        <ActionCard
          title="Test Bidding"
          description="Test the bidding functionality"
          icon={<Gavel className="w-6 h-6" />}
          href="/team-owner/test-bidding"
        />
      </motion.div>

      {/* Live Auctions & Team Performance */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Live Auctions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <Card className="border-gray-700/50 bg-gradient-to-br from-gray-900/80 to-gray-800/80 shadow-lg backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Play className="w-5 h-5 text-red-500" />
                Live Auctions
              </CardTitle>
              <CardDescription className="text-gray-400">
                Current active auctions you can participate in
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data?.liveAuctions && data.liveAuctions.length > 0 ? (
                data.liveAuctions.map((auction) => (
                  <div key={auction._id} className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-white">{auction.name}</h4>
                        <p className="text-sm text-gray-400">{auction.tournament}</p>
                      </div>
                      <Badge className="bg-red-500 text-white animate-pulse">LIVE</Badge>
                    </div>
                    
                    {auction.currentPlayer && (
                      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">{auction.currentPlayer.name}</p>
                            <p className="text-blue-400 text-sm">{auction.currentPlayer.role}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-green-400 font-bold">{formatCurrency(auction.currentPlayer.currentBid)}</p>
                            <p className="text-gray-400 text-sm">{auction.currentPlayer.timeLeft}s left</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-3 flex justify-between items-center">
                      <span className="text-gray-400 text-sm">
                        {Array.isArray(auction.participants) ? auction.participants.length : auction.participants} teams participating
                      </span>
                      <Link href={`/team-owner/auctions/${auction._id}`}>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Join Auction
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Gavel className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-400 mb-2">No Live Auctions</h3>
                  <p className="text-gray-500">Check back later for new auction opportunities.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Team Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.0 }}
        >
          <Card className="border-gray-700/50 bg-gradient-to-br from-gray-900/80 to-gray-800/80 shadow-lg backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-500" />
                Top Performers
              </CardTitle>
              <CardDescription className="text-gray-400">
                Your best performing players this season
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data?.myTeamPlayers && data.myTeamPlayers.length > 0 ? (
                data.myTeamPlayers.slice(0, 3).map((player) => (
                  <div key={player._id} className="flex items-center justify-between p-3 rounded-xl bg-gray-800/50 border border-gray-700/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                        {player?.name?.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-white font-medium">{player.name}</p>
                        <p className="text-gray-400 text-sm">{player.role}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-white font-medium">{formatCurrency(player.currentValue)}</p>
                      <div className="flex items-center gap-1">
                        {player.performance === 'up' ? (
                          <ArrowUpRight className="w-4 h-4 text-green-400" />
                        ) : player.performance === 'down' ? (
                          <ArrowDownRight className="w-4 h-4 text-red-400" />
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                        <span className={`text-sm ${
                          player.performance === 'up' ? 'text-green-400' : 
                          player.performance === 'down' ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {player.performanceChange > 0 ? '+' : ''}{player.performanceChange.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-400 mb-2">No Players Yet</h3>
                  <p className="text-gray-500">Participate in auctions to build your team.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  count?: number;
}

function ActionCard({ title, description, icon, href, count }: ActionCardProps) {
  return (
    <Link href={href}>
      <Card className="border-gray-700/50 bg-gradient-to-br from-gray-900/80 to-gray-800/80 shadow-lg backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg group-hover:shadow-blue-500/25 transition-shadow">
                  {icon}
                </div>
                {count !== undefined && (
                  <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">
                    {count}
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                {title}
              </h3>
              <p className="text-gray-400 text-sm mt-1">
                {description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
} 