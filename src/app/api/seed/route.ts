import { NextResponse } from 'next/server';
import { seedUsers } from '@/lib/seed';

export async function GET() {
  try {
    // Only allow seeding in development mode
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Seeding is only available in development mode' },
        { status: 403 }
      );
    }
    
    const result = await seedUsers();
    
    if (result.success) {
      return NextResponse.json({ message: result.message }, { status: 200 });
    } else {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }
  } catch (error) {
    console.error('API error during seeding:', error);
    return NextResponse.json(
      { error: 'An error occurred during seeding' },
      { status: 500 }
    );
  }
} 