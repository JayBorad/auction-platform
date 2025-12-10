'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import RoleWrapper from '@/components/layout/RoleWrapper';

// Helper function to get page title from pathname
const getPageTitle = (pathname: string): string => {
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length <= 2) return 'Dashboard';
  
  const page = segments[segments.length - 1];
  
  const titleMap: Record<string, string> = {
    'dashboard': 'Dashboard',
    'tournaments': 'Tournament Management',
    'teams': 'Team Management',
    'players': 'Player Management',
    'auctions': 'Auction Management',
    // 'logs': 'Logs & Activity',
    'settings': 'Settings',
  };
  
  return titleMap[page] || page.charAt(0).toUpperCase() + page.slice(1);
};

export default function ModeratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    // Initialize based on screen size if window is available
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true; // Default to expanded on server side
  });
  const pathname = usePathname();
  const { user } = useAuth();
  
  // Handle sidebar state updates
  const handleSidebarStateChange = (expanded: boolean) => {
    setSidebarExpanded(expanded);
  };

  return (
    <RoleWrapper allowedRoles={['moderator']}>
      <div className="flex h-screen overflow-hidden bg-gray-950 text-gray-100">
        <Sidebar onExpandedChange={handleSidebarStateChange} />
        
        {/* Header for mobile and desktop toggle */}
        <div 
          className={cn(
            "fixed top-0 right-0 z-20 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 transition-all duration-300",
            sidebarExpanded ? "md:left-[240px]" : "md:left-[84px]",
            "left-0" // Full width on mobile
          )}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-4">
              {/* Toggle button for desktop */}
              <button
                onClick={() => setSidebarExpanded(!sidebarExpanded)}
                className="hidden md:flex p-2 rounded-lg hover:bg-gray-700/50 text-gray-300 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {/* Page title - you can customize this per page */}
              <h1 className="text-lg font-semibold text-white hidden sm:block">
                {getPageTitle(pathname)}
              </h1>
            </div>
            
            {/* User info or actions can go here */}
            <div className="flex items-center space-x-2">
              {/* User avatar and info */}
              {user && (
                <div className="flex items-center space-x-3">
                  <div className="hidden sm:block text-right">
                    <div className="text-sm font-medium text-white">
                      {user.name || user.email?.split('@')[0]}
                    </div>
                    <div className="text-xs text-gray-400 capitalize">
                      {user.role?.replace('-', ' ')}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                    {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Main content with proper spacing for sidebar and header */}
        <main 
          className={cn(
            "flex-1 overflow-y-auto transition-all duration-300 pt-16", // Added pt-16 for header space
            sidebarExpanded ? "md:ml-[240px]" : "md:ml-[84px]"
          )}
        >
          <div className="p-4 sm:p-6 w-full">{children}</div>
        </main>
      </div>
    </RoleWrapper>
  );
} 