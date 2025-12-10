import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// GET - Fetch single user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const userId = params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    const user = await User.findById(userId)
      .select('name email role status plainPassword team createdAt updatedAt')
      .populate('team', 'name logo');

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const userId = params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, email, password, role, status, team } = body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if email is being changed and if it already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'User with this email already exists' },
          { status: 400 }
        );
      }
    }

    // ✅ Handle team validation here instead of schema validator
    if (role === 'team-owner' || (user.role === 'team-owner' && !role)) {
      if (!team && !user.team) {
        return NextResponse.json(
          { success: false, error: 'Team assignment is required for team owners' },
          { status: 400 }
        );
      }

      if (team && team !== user.team?.toString()) {
        // Check if team exists
        const Team = mongoose.model('Team');
        const teamExists = await Team.findById(team);
        if (!teamExists) {
          return NextResponse.json(
            { success: false, error: 'Selected team does not exist' },
            { status: 400 }
          );
        }

        // Check if team already has an owner
        const existingOwner = await User.findOne({
          _id: { $ne: userId },
          team,
          role: 'team-owner',
        });
        if (existingOwner) {
          return NextResponse.json(
            { success: false, error: 'Selected team already has an owner' },
            { status: 400 }
          );
        }
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (status) updateData.status = status;

    // Handle team assignment
    if (role === 'team-owner') {
      updateData.team = team;
    } else if (role && role !== 'team-owner') {
      updateData.team = null;
    }

    // Handle password update
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
      updateData.plainPassword = password;
    }

    // Update user (no custom async validator, only schema rules)
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { ...updateData, updatedAt: new Date() },
      {
        new: true,
        runValidators: true,
      }
    )
      .select('name email role status plainPassword team createdAt updatedAt')
      .populate('team', 'name logo');

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'Failed to update user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update user',
        details:
          process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// PATCH - Update user status only
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const userId = params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { status } = body;

    if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Valid status is required (active, inactive, suspended)' },
        { status: 400 }
      );
    }

    // Find and update user status
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { status, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
    .select('name email role status plainPassword team createdAt updatedAt')
    .populate('team', 'name logo');

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'User status updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating user status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to update user status',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 