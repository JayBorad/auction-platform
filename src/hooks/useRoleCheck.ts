'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { UserRole, ROLE_PATHS } from '@/constants/roles';
import { useAuth } from '@/context/AuthContext';

interface UseRoleCheckProps {
  allowedRoles: UserRole[];
  fallbackPath?: string;
}

export function useRoleCheck({ allowedRoles, fallbackPath = '/' }: UseRoleCheckProps) {
  const { user, status } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthorization = async () => {
      // Still loading session
      if (status === 'loading') {
        return;
      }

      // Not authenticated
      if (status === 'unauthenticated') {
        router.push('/login');
        return;
      }

      // Check if user role is in allowed roles
      if (user?.role && allowedRoles.includes(user.role as UserRole)) {
        setIsAuthorized(true);
      } else {
        // Redirect to appropriate role path or fallback
        const userRole = user?.role as UserRole;
        const redirectPath = userRole && ROLE_PATHS[userRole.replace('-', '')] 
          ? ROLE_PATHS[userRole.replace('-', '')] 
          : fallbackPath;
        
        router.push(redirectPath);
      }
      
      setIsLoading(false);
    };

    checkAuthorization();
  }, [status, user, allowedRoles, router, fallbackPath]);

  return { isAuthorized, isLoading };
} 