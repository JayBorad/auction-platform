import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// GET - Fetch all users
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';

    // Build query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      query.role = role;
    }
    
    if (status) {
      query.status = status;
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    try {
    // Fetch users with pagination and populate team data
    const users = await User.find(query)
      .select('name email role status plainPassword team createdAt updatedAt')
        .populate({
          path: 'team',
          select: 'name logo',
          options: { lean: true } // Use lean for better performance
        })
      .sort({ createdAt: -1 })
      .skip(skip)
        .limit(limit)
        .lean(); // Use lean for better performance

    // Get total count for pagination
    const total = await User.countDocuments(query);

      // Process users to ensure team data is safe
      const safeUsers = users.map(user => ({
        ...user,
        team: user.team || null // Ensure team is null if not found
      }));

    return NextResponse.json({
      success: true,
        data: safeUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    } catch (error) {
      console.error('Error in users query:', error);
      throw new Error('Database query failed');
    }

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch users',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { name, email, password, role, status, team } = body;

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Validate team assignment for team owners
    if (role === 'team-owner') {
      if (!team) {
        return NextResponse.json(
          { success: false, error: 'Team assignment is required for team owners' },
          { status: 400 }
        );
      }

      // Check if team exists
      const teamExists = await mongoose.model('Team').findById(team);
      if (!teamExists) {
        return NextResponse.json(
          { success: false, error: 'Selected team does not exist' },
          { status: 400 }
        );
      }

      // Check if team already has an owner
      const existingOwner = await User.findOne({ team, role: 'team-owner' });
      if (existingOwner) {
        return NextResponse.json(
          { success: false, error: 'Selected team already has an owner' },
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      plainPassword: password, // Store plain password for admin viewing
      role: role || 'team-owner',
      status: status || 'active',
      team: role === 'team-owner' ? team : null
    });

    await newUser.save();

    // Return user without sensitive data
    const userResponse = await User.findById(newUser._id)
      .select('name email role status plainPassword team createdAt updatedAt')
      .populate('team', 'name logo');

    return NextResponse.json({
      success: true,
      data: userResponse,
      message: 'User created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
} 