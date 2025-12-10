import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');
    
    if (!userCookie?.value) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    
    const user = JSON.parse(decodeURIComponent(userCookie.value));
    return NextResponse.json({ user });
  } catch (e) {
    console.error('Error handling session:', e);
    return NextResponse.json({ user: null }, { status: 401 });
  }
} 