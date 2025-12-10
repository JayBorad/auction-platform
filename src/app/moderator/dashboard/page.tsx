'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Gavel, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Activity,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Settings
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface DashboardStats {
  tournaments: {
    total: number;
    active: number;
    upcoming: number;
    completed: number;
    growth: number;
  };
  teams: {
    total: number;
    active: number;
    inactive: number;
    growth: number;
  };
  auctions: {
    total: number;
    active: number;
    completed: number;
    growth: number;
  };
  users: {
    total: number;
    moderators: number;
    teamOwners: number;
    growth: number;
  };
}

interface RecentActivity {
  _id: string;
  action: string;
  user?: {
    name: string;
    role: string;
  };
  createdAt: string; // Changed from timestamp to createdAt
  status: 'success' | 'warning' | 'error';
}

export default function ModeratorDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard stats
      const statsResponse = await fetch('/api/dashboard/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      // Fetch recent activity
      const activityResponse = await fetch('/api/logs?limit=10');
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setRecentActivity(activityData.logs || []);
      }

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Quiet fetch for background updates (doesn't show loading state)
  const fetchDashboardDataQuiet = async () => {
    try {
      // Fetch dashboard stats
      const statsResponse = await fetch('/api/dashboard/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      // Fetch recent activity
      const activityResponse = await fetch('/api/logs?limit=10');
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setRecentActivity(activityData.logs || []);
      }

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data (quiet):', error);
      // Don't show toast errors for background updates
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 30 seconds with quiet fetch
    const interval = setInterval(fetchDashboardDataQuiet, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchDashboardData();
    toast.success('Dashboard refreshed');
  };

  const getActivityIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return <Activity className="w-4 h-4 text-blue-400" />;
    }
  };

  const getTrendIcon = (growth: number) => {
    return growth >= 0 ? (
      <TrendingUp className="w-3 h-3 text-green-400" />
    ) : (
      <TrendingDown className="w-3 h-3 text-red-400" />
    );
  };

  const formatGrowth = (growth: number) => {
    const sign = growth >= 0 ? '+' : '';
    return `${sign}${growth.toFixed(1)}%`;
  };

  // Convert stats to display format matching admin dashboard
  const statsData = stats ? [
    { 
      title: 'Tournaments', 
      value: stats.tournaments.total.toString(), 
      change: formatGrowth(stats.tournaments.growth),
      trend: stats.tournaments.growth >= 0 ? 'up' : 'down',
      icon: <Trophy className="h-6 w-6" />, 
      color: 'from-amber-600 to-amber-400',
      additionalInfo: `${stats.tournaments.active} Active, ${stats.tournaments.upcoming} Upcoming`
    },
    { 
      title: 'Teams', 
      value: stats.teams.total.toString(), 
      change: formatGrowth(stats.teams.growth),
      trend: stats.teams.growth >= 0 ? 'up' : 'down',
      icon: <Users className="h-6 w-6" />, 
      color: 'from-purple-600 to-purple-400',
      additionalInfo: `${stats.teams.active} Active, ${stats.teams.inactive} Inactive`
    },
    { 
      title: 'Auctions', 
      value: stats.auctions.total.toString(), 
      change: formatGrowth(stats.auctions.growth),
      trend: stats.auctions.growth >= 0 ? 'up' : 'down',
      icon: <Gavel className="h-6 w-6" />, 
      color: 'from-green-600 to-green-400',
      additionalInfo: `${stats.auctions.active} Live, ${stats.auctions.completed} Completed`
    },
    { 
      title: 'Users', 
      value: stats.users.total.toString(), 
      change: formatGrowth(stats.users.growth),
      trend: stats.users.growth >= 0 ? 'up' : 'down',
      icon: <Users className="h-6 w-6" />, 
      color: 'from-blue-600 to-blue-400',
      additionalInfo: `${stats.users.moderators} Moderators, ${stats.users.teamOwners} Team Owners`
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

  const itemVariants:any = {
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

  if (loading && !stats) {
    return (
      <div className="space-y-8">
        <div className="p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 backdrop-blur-md animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-700 rounded w-32"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-800 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-4 sm:space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome section */}
      <motion.div 
        className="p-4 sm:p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 backdrop-blur-md"
        variants={itemVariants}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight bg-gradient-to-br from-white to-gray-400 text-transparent bg-clip-text">
              Moderator Dashboard
            </h1>
            
            <div className="mt-2 flex items-center gap-2">
              <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                <Shield className="w-3 h-3 mr-1" />
                Moderator Access
              </Badge>
            </div>
          </div>
          
          {/* <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button> */}
        </div>
        
        <div className="mt-6 p-4 rounded-xl bg-green-600/10 border border-green-500/20">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-green-600/20 text-green-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-gray-300">Monitor and manage tournament activities</p>
              <p className="text-sm text-gray-500 mt-1">Oversee auctions, teams, and maintain platform integrity</p>
              {stats && (
                <div className="mt-2 text-xs text-gray-400">
                  Live Auctions: {stats.auctions.active} | 
                  Active Tournaments: {stats.tournaments.active} | 
                  Total Teams: {stats.teams.total}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat, index) => (
          <motion.div 
            key={stat.title} 
            variants={itemVariants}
            className="col-span-1"
          >
            <Card className="border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-800/80 shadow-md h-full backdrop-blur-sm overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1 text-white">{stat.value}</p>
                    <div className="flex items-center mt-2 text-xs">
                      {stat.trend === 'up' ? (
                        <TrendingUp className="w-3 h-3 text-green-400 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-400 mr-1" />
                      )}
                      <span className={stat.trend === 'up' ? 'text-green-400' : 'text-red-400'}>
                        {stat.change}
                      </span>
                      <span className="text-gray-500 ml-1">from last month</span>
                    </div>
                    {stat.additionalInfo && (
                      <p className="text-xs text-gray-500 mt-1">{stat.additionalInfo}</p>
                    )}
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                    {stat.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="w-full">
        {/* Recent Activity */}
        {/* <motion.div variants={itemVariants}>
          <Card className="border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Recent Activity
              </CardTitle>
              <CardDescription className="text-gray-400">
                Latest system activities and user actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div key={activity._id} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                      <div className="flex-shrink-0 mt-0.5">
                        {getActivityIcon(activity.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">{activity.action}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {activity.user && (
                            <span className="text-gray-400 text-xs">
                              by {activity.user.name} ({activity.user.role})
                            </span>
                          )}
                          <span className="text-gray-500 text-xs">
                            {(() => {
                              const date = new Date(activity.createdAt); // Changed from timestamp to createdAt
                              return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleTimeString();
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Activity className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div> */}

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <Card className="border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Moderator Controls
              </CardTitle>
              <CardDescription className="text-gray-400">
                Common moderator tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                <ActionCard 
                  title="Manage Tournaments" 
                  description="Create and oversee tournaments"
                  icon={<Trophy className="h-5 w-5" />}
                  href="/moderator/tournaments"
                />
                <ActionCard 
                  title="Monitor Auctions" 
                  description="Oversee live auction events"
                  icon={<Gavel className="h-5 w-5" />}
                  href="/moderator/auctions"
                />
                <ActionCard 
                  title="View Teams" 
                  description="Monitor team registrations"
                  icon={<Users className="h-5 w-5" />}
                  href="/moderator/teams"
                />
                <ActionCard 
                  title="System Settings" 
                  description="Configure platform settings"
                  icon={<Settings className="h-5 w-5" />}
                  href="/moderator/settings"
                />
                {/* <ActionCard 
                  title="Activity Logs" 
                  description="Review system activities"
                  icon={<Activity className="h-5 w-5" />}
                  href="/moderator/logs"
                /> */}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Footer Info */}
      {/* <motion.div variants={itemVariants} className="text-center text-xs text-gray-500">
        <p>Last updated: {lastRefresh.toLocaleString()}</p>
        <p>Moderator Dashboard - Real-time data with auto-refresh</p>
      </motion.div> */}
    </motion.div>
  );
}

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
}

function ActionCard({ title, description, icon, href }: ActionCardProps) {
  return (
    <motion.div
      className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:bg-gray-700/30 transition-colors flex items-start gap-3 group cursor-pointer"
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      whileTap={{ y: 0 }}
      onClick={() => window.location.href = href}
    >
      <div className="p-2 rounded-full bg-purple-600/20 text-purple-400 group-hover:bg-purple-600/30 transition-colors">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
        <p className="text-xs text-gray-400 mt-1">{description}</p>
      </div>
    </motion.div>
  );
} 