'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useWebSocket } from '@/context/WebSocketContext';
import { UserRole, ROLE_PATHS } from '@/constants/roles';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';


interface RoleWrapperProps {
  allowedRoles: string[];
  children: React.ReactNode;
  fallbackPath?: string;
}

const RoleWrapper = ({
  allowedRoles,
  children,
  fallbackPath = '/',
}: RoleWrapperProps) => {
  const router = useRouter();
  const { user, status } = useAuth();
  const { isConnected, connectedUsers, connectionInfo, wsManager } = useWebSocket();

  // Additional check: also verify connection through WebSocket manager directly
  const actualConnected = isConnected || wsManager.isConnected;
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(true);

  // Debug connection status
  useEffect(() => {
    console.log('🔍 RoleWrapper: Connection status - isConnected:', isConnected, 'actualConnected:', actualConnected, 'connectionInfo:', connectionInfo);
  }, [isConnected, actualConnected, connectionInfo]);

  // Log on mount
  useEffect(() => {
    console.log('🔍 RoleWrapper: Component mounted, initial connection status:', { isConnected, actualConnected, connectionInfo });
  }, []); // Empty dependency array for mount only

  useEffect(() => {
    // Still loading session
    if (status === 'loading') {
      return;
    }

    // Not authenticated
    if (status === 'unauthenticated') {
      // Don't redirect here to avoid conflicts with layout redirects
      setIsLoading(false);
      return;
    }

    // Check if user role is in allowed roles
    if (user?.role && allowedRoles.includes(user.role as string)) {
      setIsAuthorized(true);
    } else {
      // Don't redirect here to avoid conflicts with layout redirects
      // Just set isAuthorized to false and let layouts handle redirects
    }
    
    setIsLoading(false);
  }, [status, user, allowedRoles, router, fallbackPath]);

  useEffect(() => {
    // Check if user has required role
    if (status === 'authenticated' && user) {
      if (!allowedRoles.includes(user.role)) {
        router.replace('/');
      }
    } else if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [user, status, allowedRoles, router]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-pulse flex space-x-4">
        <div className="h-12 w-12 rounded-full bg-gray-800"></div>
        <div className="space-y-2">
          <div className="h-4 w-48 bg-gray-800 rounded"></div>
          <div className="h-4 w-24 bg-gray-800 rounded"></div>
        </div>
      </div>
    </div>;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return null;
  }

  // Group users by role
  const usersByRole = connectedUsers.reduce((acc, user) => {
    if (!acc[user.role]) {
      acc[user.role] = 0;
    }
    acc[user.role]++;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      {children}
      
      {/* Connected Users Popup */}
      {showPopup && (
        <div 
          className={cn(
            "fixed bottom-4 right-4 bg-gray-900/90 backdrop-blur-lg border border-gray-800",
            "rounded-lg shadow-lg p-3 z-50 transition-all duration-300",
            "hover:bg-gray-900/95"
          )}
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Connected Users</span>
              <button 
                onClick={() => setShowPopup(false)}
                className="text-gray-500 hover:text-gray-300"
              >
                ×
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(usersByRole).map(([role, count]) => (
                <Badge 
                  key={role}
                  variant="outline" 
                  className={cn(
                    "capitalize bg-gray-800/50",
                    role === user.role && "border-blue-500"
                  )}
                >
                  {role.replace('-', ' ')} ({count})
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className={cn(
                "w-2 h-2 rounded-full",
                actualConnected ? "bg-green-500 animate-pulse" :
                connectionInfo?.usePollingFallback ? "bg-yellow-500 animate-pulse" :
                "bg-red-500"
              )} />
              <span className="text-xs text-gray-400">
                {actualConnected ? 'WebSocket' :
                 connectionInfo?.usePollingFallback ? 'Polling Fallback' :
                 'Disconnected'}
              </span>
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-gray-500 flex flex-col">
                  <span>URL: {process.env.NEXT_PUBLIC_WS_URL}</span>
                  {connectionInfo && (
                    <div className="text-xs space-y-1">
                      <span>Connected: {connectionInfo.connected ? 'Yes' : 'No'}</span>
                      <span>User: {connectionInfo.userId || 'None'}</span>
                      <span>Polling: {connectionInfo.usePollingFallback ? 'Yes' : 'No'}</span>
                      <span>HB: {new Date(connectionInfo.lastHeartbeat).toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RoleWrapper; 