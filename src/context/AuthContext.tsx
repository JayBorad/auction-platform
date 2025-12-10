'use client';

import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User, AuthSession } from '@/types/auth';
import { useRouter } from 'next/navigation';
import { Loading } from '@/components/ui/loading';

interface AuthContextType {
  user: User | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  signOut: () => void;
  redirectToRoleDashboard: () => void;
  updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  status: 'loading',
  signOut: () => {},
  redirectToRoleDashboard: () => {},
  updateUser: () => {},
});

interface AuthContextProviderProps {
  children: ReactNode;
}

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthContextProvider({ children }: AuthContextProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const router = useRouter();
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First check server-side session
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        
        if (data.user) {
          setUser(data.user);
          setStatus('authenticated');
          localStorage.setItem('user', JSON.stringify(data.user));
        } else {
          // If no server session, check localStorage as fallback
          const userData = localStorage.getItem('user');
          if (userData) {
            try {
              const parsedUser = JSON.parse(userData);
              // Verify the stored user data with server
              const verifyResponse = await fetch('/api/auth/session');
              const verifyData = await verifyResponse.json();
              
              if (verifyData.user) {
                setUser(parsedUser);
                setStatus('authenticated');
              } else {
                localStorage.removeItem('user');
                setStatus('unauthenticated');
              }
            } catch (e) {
              console.error('Error parsing user data:', e);
              localStorage.removeItem('user');
              setStatus('unauthenticated');
            }
          } else {
            setStatus('unauthenticated');
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setStatus('unauthenticated');
      }
    };
    
    checkAuth();
  }, []);
  
  // Update user data in context
  const updateUser = (userData: User) => {
    setUser(userData);
    setStatus('authenticated');
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(userData));
    }
  };

  // Redirect user based on their role
  const redirectToRoleDashboard = () => {
    // Get current user from localStorage if user state is not available
    let currentUser = user;
    if (!currentUser && typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          currentUser = JSON.parse(userData);
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
    }
    
    if (!currentUser) return;
    
    switch (currentUser.role) {
      case 'admin':
        router.push('/admin/dashboard?from=login');
        break;
      case 'moderator':
        router.push('/moderator/dashboard?from=login');
        break;
      case 'team-owner':
        router.push('/team-owner/dashboard?from=login');
        break;
      default:
        router.push('/dashboard?from=login');
        break;
    }
  };

  const signOut = async () => {
    if (typeof window !== 'undefined') {
      try {
        // Call the logout API
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        });
        
        // Clear localStorage
        localStorage.removeItem('user');
        
        // Update state
        setUser(null);
        setStatus('unauthenticated');
        
        // Redirect
        window.location.href = '/login';
      } catch (error) {
        console.error('Error signing out:', error);
        
        // Even if API fails, attempt to clear local data
        localStorage.removeItem('user');
        setUser(null);
        setStatus('unauthenticated');
        window.location.href = '/login';
      }
    }
  };
  
  // Show loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" withText />
      </div>
    );
  }
  
  return (
    <AuthContext.Provider value={{ user, status, signOut, redirectToRoleDashboard, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
} 