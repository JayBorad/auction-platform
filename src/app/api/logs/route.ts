import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import mongoose from 'mongoose';

// Activity Log Schema
const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'BID_PLACED', 'AUCTION_STARTED', 'AUCTION_ENDED']
  },
  resource: {
    type: String,
    required: true
  },
  resourceId: {
    type: String,
    required: true
  },
  details: String,
  ipAddress: String,
  userAgent: String,
  status: {
    type: String,
    enum: ['success', 'failed', 'warning'],
    default: 'success'
  }
}, {
  timestamps: true
});

// Create model if it doesn't exist
const ActivityLog = mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema);

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const level = searchParams.get('level') || 'all';
    const dateFilter = searchParams.get('date') || 'all';

    // Build query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { action: { $regex: search, $options: 'i' } },
        { resource: { $regex: search, $options: 'i' } },
        { details: { $regex: search, $options: 'i' } }
      ];
    }

    if (level !== 'all') {
      query.status = level;
    }

    // Date filtering
    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(0);
      }

      query.createdAt = { $gte: startDate };
    }

    // Get logs with user population
    const logs = await ActivityLog.find(query)
      .populate('user', 'name email role avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await ActivityLog.countDocuments(query);

    // // If no real logs exist, create some sample data
    // if (logs.length === 0 && page === 1) {
    //   // This would normally be handled by middleware/logging system
    //   const sampleLogs = [
    //     {
    //       user: null, // We'll populate this manually
    //       action: 'TOURNAMENT_CREATED',
    //       resource: 'Tournament',
    //       resourceId: 'auto-generated',
    //       details: 'Tournament created with automatic auction',
    //       ipAddress: '127.0.0.1',
    //       userAgent: 'System',
    //       status: 'success',
    //       createdAt: new Date()
    //     }
    //   ];

    //   return NextResponse.json({
    //     success: true,
    //     logs: sampleLogs.map(log => ({
    //       _id: new mongoose.Types.ObjectId().toString(),
    //       action: log.action,
    //       level: log.status || 'info',
    //       user: {
    //         name: 'System',
    //         email: 'system@auction.com',
    //         role: 'system',
    //         avatar: null
    //       },
    //       metadata: {
    //         resource: log.resource,
    //         resourceId: log.resourceId,
    //         details: log.details
    //       },
    //       ipAddress: log.ipAddress,
    //       userAgent: log.userAgent,
    //       createdAt: log.createdAt.toISOString()
    //     })),
    //     pagination: {
    //       currentPage: page,
    //       totalPages: 1,
    //       totalItems: sampleLogs.length,
    //       itemsPerPage: limit,
    //       hasNextPage: false,
    //       hasPrevPage: false
    //     }
    //   });
    // }

    return NextResponse.json({
      success: true,
      logs: logs.map(log => ({
        _id: log._id,
        user: log.user || {
          name: 'Unknown User',
          email: 'unknown@auction.com',
          role: 'user',
          avatar: null
        },
        action: log.action,
        level: log.status || 'info', // Map status to level
        metadata: {
          resource: log.resource,
          resourceId: log.resourceId,
          details: log.details
        },
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt.toISOString()
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { userId, action, resource, resourceId, details, ipAddress, userAgent, status } = body;

    const log = new ActivityLog({
      user: userId,
      action,
      resource,
      resourceId,
      details,
      ipAddress: ipAddress || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: userAgent || request.headers.get('user-agent') || 'unknown',
      status: status || 'success'
    });

    await log.save();

    return NextResponse.json({
      success: true,
      data: log
    });

  } catch (error) {
    console.error('Error creating activity log:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create activity log' },
      { status: 500 }
    );
  }
} 