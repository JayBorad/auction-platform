import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    console.log(`Login attempt for: ${email}`);
    
    if (!email || !password) {
      console.log('Missing email or password');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Establish connection to database
    try {
      await connectDB();
      console.log('Database connection established for login');
    } catch (connError) {
      console.error('Database connection failed:', connError);
      return NextResponse.json(
        { error: 'Database connection failed. Please try again later.' },
        { status: 500 }
      );
    }
    
    // Find the user in the database
    try {
      console.log(`Searching for user with email: ${email}`);
      const dbUser = await User.findOne({ email }).populate('team').exec();
      
      if (!dbUser) {
        console.log(`User not found with email: ${email}`);
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }
      
      // Check if user is active
      if (dbUser.status !== 'active') {
        console.log(`User account is ${dbUser.status}: ${email}`);
        return NextResponse.json(
          { error: `Account is ${dbUser.status}. Please contact support.` },
          { status: 401 }
        );
      }
      
      // User found, verify password
      console.log('User found, verifying password');
      
      // Check if password exists
      if (!dbUser.password) {
        console.error('User has no password set');
        return NextResponse.json(
          { error: 'Account configuration error. Please contact support.' },
          { status: 500 }
        );
      }
      
      // Verify the password
      const passwordMatch = await bcrypt.compare(password, dbUser.password);
      
      if (!passwordMatch) {
        console.log('Password verification failed');
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }
      
      // Authentication successful
      console.log('Authentication successful for user:', dbUser.email);
      
      // Create user data without sensitive information
      const userData = {
        id: dbUser._id.toString(),
        email: dbUser.email,
        role: dbUser.role,
        name: dbUser.name,
        status: dbUser.status
      };

      // If user is a team owner, include team information
      if (dbUser.role === 'team-owner' && dbUser.team) {
        userData.team = {
          _id: dbUser.team._id.toString(),
          name: dbUser.team.name,
          logo: dbUser.team.logo || null
        };
      }

      // Set the cookie with user data
      const cookieStore = cookies();
      cookieStore.set('user', JSON.stringify(userData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      });
      
      return NextResponse.json({ 
        user: userData,
        message: 'Login successful'
      });
    } catch (userError) {
      console.error('Error during user lookup or authentication:', userError);
      return NextResponse.json(
        { error: 'Authentication error occurred. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('General login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
} 