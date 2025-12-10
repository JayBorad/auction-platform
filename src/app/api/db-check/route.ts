import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function GET() {
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connection established');
    
    // Try to count users
    const userCount = await User.countDocuments();
    console.log(`Found ${userCount} users in the database`);
    
    // Try to get a list of users (without passwords)
    const users = await User.find({}).select('-password').limit(5);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection successful',
      userCount,
      sampleUsers: users
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to database', details: error.message },
      { status: 500 }
    );
  }
} 