'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';
import { Users2, Trophy, UserCircle, Gavel, BarChart3, Settings, ShieldAlert, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';

// Define the User type for our localStorage data
type User = {
  name: string;
  role: string;
  email?: string;
};

interface DashboardStats {
  totalUsers: {
    value: number;
    change: string;
    trend: 'up' | 'down';
  };
  totalTeams: {
    value: number;
    change: string;
    trend: 'up' | 'down';
  };
  totalTournaments: {
    value: number;
    change: string;
    trend: 'up' | 'down';
  };
  activeAuctions: {
    value: number;
    change: string;
    trend: 'up' | 'down';
  };
  additionalStats: {
    completedTournaments: number;
    liveAuctions: number;
    upcomingTournaments: number;
    totalPlayers: number;
  };
}

export default function AdminDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
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

  // Fetch real dashboard statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/dashboard/stats');
        const data = await response.json();
        
        if (data.success) {
          setStats(data.data);
        } else {
          toast.error('Failed to load dashboard statistics');
          // Fallback to mock data
          setStats({
            totalUsers: { value: 0, change: '0', trend: 'up' },
            totalTeams: { value: 0, change: '0', trend: 'up' },
            totalTournaments: { value: 0, change: '0', trend: 'up' },
            activeAuctions: { value: 0, change: '0', trend: 'up' },
            additionalStats: {
              completedTournaments: 0,
              liveAuctions: 0,
              upcomingTournaments: 0,
              totalPlayers: 0
            }
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        toast.error('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Convert stats to display format
  const statsData = stats ? [
    { 
      title: 'Total Users', 
      value: stats.totalUsers.value.toString(), 
      change: stats.totalUsers.change,
      trend: stats.totalUsers.trend,
      icon: <Users2 />, 
      color: 'from-blue-600 to-blue-400' 
    },
    { 
      title: 'Teams', 
      value: stats.totalTeams.value.toString(), 
      change: stats.totalTeams.change,
      trend: stats.totalTeams.trend,
      icon: <UserCircle />, 
      color: 'from-purple-600 to-purple-400' 
    },
    { 
      title: 'Tournaments', 
      value: stats.totalTournaments.value.toString(), 
      change: stats.totalTournaments.change,
      trend: stats.totalTournaments.trend,
      icon: <Trophy />, 
      color: 'from-amber-600 to-amber-400' 
    },
    { 
      title: 'Total Auctions', 
      value: stats.activeAuctions.value.toString(), 
      change: stats.activeAuctions.change,
      trend: stats.activeAuctions.trend,
      icon: <Gavel />, 
      color: 'from-green-600 to-green-400' 
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
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome section */}
      <motion.div 
        className="p-4 sm:p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 backdrop-blur-md"
        variants={itemVariants as any}
      >
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-br from-white to-gray-400 text-transparent bg-clip-text">
          Admin Dashboard
        </h1>
        
        <div className="mt-2 flex items-center">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
            {user?.role === 'admin' ? 'Administrator' : 'User'}
          </span>
        </div>
        
        <div className="mt-6 p-4 rounded-xl bg-purple-600/10 border border-purple-500/20">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-purple-600/20 text-purple-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-gray-300">Welcome to the Admin Control Panel</p>
              <p className="text-sm text-gray-500 mt-1">You have full access to manage all platform features</p>
              {stats && (
                <div className="mt-2 text-xs text-gray-400">
                  Live Auctions: {stats.additionalStats.liveAuctions} | 
                  Upcoming Tournaments: {stats.additionalStats.upcomingTournaments} | 
                  Completed: {stats.additionalStats.completedTournaments}
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
            variants={itemVariants as any}
            className="col-span-1"
          >
            <Card className="border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-800/80 shadow-md h-full backdrop-blur-sm overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1 text-white">{stat.value}</p>
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
      
      {/* Quick actions */}
      <motion.div 
        variants={itemVariants as any}
        className="p-6 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50"
      >
        <h2 className="text-xl font-semibold mb-4 text-gray-200">Admin Controls</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <ActionCard 
            title="User Management" 
            description="Add, edit or remove users"
            icon={<Users2 className="h-5 w-5" />}
            href="/admin/users"
          />
          <ActionCard 
            title="Tournament Management" 
            description="Create and manage tournaments"
            icon={<Trophy className="h-5 w-5" />}
            href="/admin/tournaments"
          />
          <ActionCard 
            title="System Settings" 
            description="Configure platform settings"
            icon={<Settings className="h-5 w-5" />}
            href="/admin/settings"
          />
          {/* <ActionCard 
            title="Analytics" 
            description="View platform statistics"
            icon={<BarChart3 className="h-5 w-5" />}
            href="/admin/analytics"
          /> */}
          <ActionCard 
            title="Teams Management" 
            description="Manage all teams"
            icon={<UserCircle className="h-5 w-5" />}
            href="/admin/teams"
          />
          <ActionCard 
            title="Auction Controls" 
            description="Manage auction settings"
            icon={<Gavel className="h-5 w-5" />}
            href="/admin/auction"
          />
        </div>
      </motion.div>
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
    <Link href={href}>
      <motion.div
        className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:bg-gray-700/30 transition-colors flex items-start gap-3 group cursor-pointer"
        whileHover={{ y: -5, transition: { duration: 0.2 } }}
        whileTap={{ y: 0 }}
      >
        <div className="p-2 rounded-full bg-purple-600/20 text-purple-400 group-hover:bg-purple-600/30 transition-colors">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
          <p className="text-xs text-gray-400 mt-1">{description}</p>
        </div>
      </motion.div>
    </Link>
  );
} 