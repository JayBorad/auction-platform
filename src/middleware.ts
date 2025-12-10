import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ROLE_PATHS } from './constants/roles';

// Function to get user from cookies
function getUserFromCookies(request: NextRequest) {
  try {
    const userCookie = request.cookies.get('user')?.value;
    if (!userCookie) return null;
    
    return JSON.parse(decodeURIComponent(userCookie));
  } catch (e) {
    console.error('Error parsing user cookie:', e);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  // Get the pathname from the request
  const { pathname } = request.nextUrl;
  

  // Allow Socket.IO/WebSocket upgrade path to pass through untouched
  if (pathname.startsWith('/socket.io')) {
    return NextResponse.next();
  }
  
  // Skip middleware for API routes
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }
  
  // Get user from cookies
  const user = getUserFromCookies(request);
  
  // Define public paths that don't require authentication
  const publicPaths = ['/login', '/register'];
  const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith(`${path}/`));
  
  // Define protected admin paths
  const adminProtectedPaths = ['/admin'];
  
  // Define protected moderator paths
  const moderatorProtectedPaths = ['/moderator'];
  
  // Define protected team owner paths
  const teamOwnerProtectedPaths = ['/team-owner'];
  
  // Check if the path is protected and requires authentication
  const isProtectedPath = [
    ...adminProtectedPaths,
    ...moderatorProtectedPaths,
    ...teamOwnerProtectedPaths,
    '/dashboard'
  ].some(path => pathname.startsWith(path));
  
  // Prevent redirect loops by checking URL query parameters
  const url = new URL(request.url);
  const redirectParam = url.searchParams.get('from');
  const hasRedirectParam = !!redirectParam;
  
  // Redirect to login if not authenticated and trying to access protected routes
  if (isProtectedPath && !user) {
    // Prevent redirect loops
    if (hasRedirectParam && redirectParam === 'login') {
      // We've already tried redirecting, clear cookies and continue
      const response = NextResponse.next();
      response.cookies.delete('user');
      return response;
    }
    
    // Otherwise redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', 'protected');
    return NextResponse.redirect(loginUrl);
  }
  
  // Redirect to dashboard if authenticated and trying to access login page
  if (isPublicPath && user) {
    // Prevent redirect loops
    if (hasRedirectParam && redirectParam === 'dashboard') {
      // We've already tried redirecting, let them access the public page
      return NextResponse.next();
    }
    
    // Redirect to appropriate dashboard based on role
    const dashboardUrl = new URL(getDashboardPathByRole(user.role), request.url);
    dashboardUrl.searchParams.set('from', 'login');
    return NextResponse.redirect(dashboardUrl);
  }
  
  // Role-based redirects for protected paths
  if (isProtectedPath && user) {
    const role = user.role as string;
    
    // Admin route protection
    if (adminProtectedPaths.some(path => pathname.startsWith(path)) && role !== 'admin') {
      // Redirect to appropriate dashboard based on role
      return redirectToUserDashboard(request, role);
    }
    
    // Moderator route protection
    if (moderatorProtectedPaths.some(path => pathname.startsWith(path)) 
        && role !== 'moderator' && role !== 'admin') {
      // Redirect to appropriate dashboard based on role
      return redirectToUserDashboard(request, role);
    }
    
    // Team owner route protection
    if (teamOwnerProtectedPaths.some(path => pathname.startsWith(path))
        && role !== 'team-owner' && role !== 'admin') {
      return redirectToUserDashboard(request, role);
    }
  }
  
  return NextResponse.next();
}

// Helper function to redirect user to appropriate dashboard
function redirectToUserDashboard(request: NextRequest, role: string) {
  const dashboardPath = getDashboardPathByRole(role);
  const dashboardUrl = new URL(dashboardPath, request.url);
  dashboardUrl.searchParams.set('from', 'redirect');
  return NextResponse.redirect(dashboardUrl);
}

// Helper function to get dashboard path by role
function getDashboardPathByRole(role: string): string {
  if (role === 'admin') {
    return ROLE_PATHS.admin || '/dashboard';
  } else if (role === 'moderator') {
    return ROLE_PATHS.moderator || '/dashboard';
  } else if (role === 'team-owner') {
    return ROLE_PATHS.teamOwner || '/dashboard';
  }
  return '/dashboard';
}

// See https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|socket.io).*)',
  ],
}; 