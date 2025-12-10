import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Team from '@/models/Team';
import Tournament from '@/models/Tournament';
import Auction from '@/models/Auction';
import Player from '@/models/Player';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get current statistics
    const [
      totalUsers,
      totalTeams, 
      totalTournaments,
      activeAuctions,
      completedTournaments,
      liveAuctions,
      upcomingTournaments,
      totalPlayers
    ] = await Promise.all([
      User.countDocuments({}),
      Team.countDocuments({}),
      Tournament.countDocuments({}), 
      Auction.countDocuments({ status: { $ne: 'completed' } }),
      Tournament.countDocuments({ status: 'completed' }),
      Auction.countDocuments({ status: 'live' }),
      Tournament.countDocuments({ status: 'upcoming' }),
      Player.countDocuments({}) // Remove isActive filter to count all players
    ]);

    // Calculate time-based comparisons for better trend analysis
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      usersThisWeek,
      usersThisMonth,
      teamsThisWeek,
      teamsThisMonth,
      tournamentsThisWeek,
      tournamentsThisMonth,
      auctionsThisWeek,
      auctionsThisMonth,
      playersThisWeek,
      playersThisMonth
    ] = await Promise.all([
      User.countDocuments({ 
        createdAt: { $gte: lastWeek }
      }), // Remove isActive filter
      User.countDocuments({ 
        createdAt: { $gte: lastMonth }
      }), // Remove isActive filter
      Team.countDocuments({ 
        createdAt: { $gte: lastWeek }
      }), // Remove isActive filter
      Team.countDocuments({ 
        createdAt: { $gte: lastMonth }
      }), // Remove isActive filter
      Tournament.countDocuments({ 
        createdAt: { $gte: lastWeek }
      }), // Remove isActive filter
      Tournament.countDocuments({ 
        createdAt: { $gte: lastMonth }
      }), // Remove isActive filter
      Auction.countDocuments({ 
        createdAt: { $gte: lastWeek }
      }),
      Auction.countDocuments({ 
        createdAt: { $gte: lastMonth }
      }),
      Player.countDocuments({ 
        createdAt: { $gte: lastWeek }
      }), // Remove isActive filter
      Player.countDocuments({ 
        createdAt: { $gte: lastMonth }
      }) // Remove isActive filter
    ]);

    // Calculate growth percentages and trends
    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return { change: current > 0 ? '+100%' : '0%', trend: 'up' as const };
      const growth = ((current - previous) / previous) * 100;
      return {
        change: growth > 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`,
        trend: growth >= 0 ? 'up' as const : 'down' as const
      };
    };

    // Calculate weekly growth vs last week
    const usersGrowth = calculateGrowth(usersThisWeek, Math.max(0, totalUsers - usersThisMonth));
    const teamsGrowth = calculateGrowth(teamsThisWeek, Math.max(0, totalTeams - teamsThisMonth));
    const tournamentsGrowth = calculateGrowth(tournamentsThisWeek, Math.max(0, totalTournaments - tournamentsThisMonth));
    const auctionsGrowth = calculateGrowth(auctionsThisWeek, Math.max(0, activeAuctions - auctionsThisMonth));

    const stats = {
      totalUsers: {
        value: totalUsers,
        change: usersGrowth.change,
        trend: usersGrowth.trend
      },
      totalTeams: {
        value: totalTeams,
        change: teamsGrowth.change,
        trend: teamsGrowth.trend
      },
      totalTournaments: {
        value: totalTournaments,
        change: tournamentsGrowth.change,
        trend: tournamentsGrowth.trend
      },
      activeAuctions: {
        value: activeAuctions,
        change: auctionsGrowth.change,
        trend: auctionsGrowth.trend
      },
      additionalStats: {
        completedTournaments,
        liveAuctions,
        upcomingTournaments,
        totalPlayers,
        recentActivity: {
          usersThisWeek,
          teamsThisWeek,
          tournamentsThisWeek,
          auctionsThisWeek,
          playersThisWeek
        }
      }
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}