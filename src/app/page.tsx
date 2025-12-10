'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ROLE_PATHS } from '@/constants/roles';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const router = useRouter();
  const { user, status, redirectToRoleDashboard } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (status === 'authenticated' && user) {
        // Use the auth context to redirect to appropriate dashboard
        redirectToRoleDashboard();
      } else if (status === 'unauthenticated') {
        // Only set loading to false once we know the auth status
        setLoading(false);
      }
    }
  }, [user, status, redirectToRoleDashboard]);

  // Redirect to login page if not authenticated
  useEffect(() => {
    if (!loading && status === 'unauthenticated') {
      router.push('/login');
    }
  }, [loading, status, router]);

  if (loading || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse flex space-x-4">
          <div className="h-12 w-12 rounded-full bg-gray-800"></div>
          <div className="space-y-2">
            <div className="h-4 w-48 bg-gray-800 rounded"></div>
            <div className="h-4 w-24 bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center py-12 px-4">
      <div className="max-w-4xl w-full text-center space-y-8">
        <h1 className="text-5xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600">
          Welcome to the Auction Platform
        </h1>
        
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          A professional platform for managing cricket auctions with role-based access control
        </p>
        
        {user ? (
          <div className="flex flex-col items-center gap-4">
            <div className="text-lg text-gray-300">
              Welcome back, <span className="font-semibold text-blue-400">{user.name}</span>!
            </div>
            <div className="text-gray-400">Redirecting to your dashboard...</div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Button asChild size="lg" className="px-8 py-6 text-lg">
              <Link href="/login" className="flex items-center gap-2">
                Sign In <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
