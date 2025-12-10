'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  Trophy, 
  Shield, 
  User, 
  Gavel, 
  ActivitySquare,
  ChevronLeft, 
  ChevronRight,
  LogOut,
  Menu,
  X,
  UserCog,
  Calendar,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { ROLE_PATHS } from '@/constants/roles';

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
  activePattern?: RegExp; // Add pattern to match active routes
};

interface SidebarProps {
  onExpandedChange?: (expanded: boolean) => void;
}

export default function Sidebar({ onExpandedChange }: SidebarProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();

  // Effect to handle sidebar state based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        // Keep current expanded state on desktop (don't auto-collapse)
        if (onExpandedChange) {
          onExpandedChange(expanded);
        }
      } else {
        // Always collapse on mobile
        setExpanded(false);
        if (onExpandedChange) {
          onExpandedChange(false);
        }
      }
    };

    // Set initial state based on screen size
    if (typeof window !== 'undefined') {
      const initialExpandedState = window.innerWidth >= 768;
      setExpanded(initialExpandedState);
      if (onExpandedChange) {
        onExpandedChange(initialExpandedState);
      }
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Remove onExpandedChange from dependency array to prevent infinite re-renders

  // Effect to notify parent components when expanded state changes
  useEffect(() => {
    if (onExpandedChange) {
      onExpandedChange(expanded);
    }
  }, [expanded, onExpandedChange]);

  // Close mobile sidebar when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navItems: NavItem[] = [
    // Dashboard - Always first
    {
      label: 'Dashboard',
      href: user?.role === 'admin' 
        ? '/admin/dashboard'
        : user?.role === 'moderator'
          ? '/moderator/dashboard'
          : user?.role === 'team-owner'
            ? '/team-owner/dashboard'
            : '/dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      roles: ['admin', 'moderator', 'team-owner'],
      activePattern: /^\/(?:admin|moderator|team-owner)?\/(?:dashboard)?$/,
    },
    
    // Admin-only pages
    {
      label: 'Users',
      href: '/admin/users',
      icon: <UserCog className="h-5 w-5" />,
      roles: ['admin'],
      activePattern: /^\/admin\/users/,
    },
    {
      label: 'Tournaments',
      href: user?.role === 'admin' 
        ? '/admin/tournaments' 
        : user?.role === 'moderator'
          ? '/moderator/tournaments'
          : '/team-owner/tournaments',
      icon: <Trophy className="h-5 w-5" />,
      roles: ['admin', 'moderator', 'team-owner'],
      activePattern: /^\/(?:admin|moderator|team-owner)?\/tournaments/,
    },
    {
      label: 'Teams',
      href: user?.role === 'admin' 
        ? '/admin/teams'
        : user?.role === 'moderator'
          ? '/moderator/teams'
          : '/team-owner/teams',
      icon: <Shield className="h-5 w-5" />,
      roles: ['admin', 'moderator', 'team-owner'],
      activePattern: /^\/(?:admin|moderator|team-owner)?\/teams/,
    },
    {
      label: 'Players',
      href: user?.role === 'admin' 
        ? '/admin/players'
        : user?.role === 'moderator'
          ? '/moderator/players'
          : '/team-owner/players',
      icon: <User className="h-5 w-5" />,
      roles: ['admin', 'moderator', 'team-owner'],
      activePattern: /^\/(?:admin|moderator|team-owner)?\/players/,
    },
    {
      label: 'Auctions',
      href: user?.role === 'admin' 
        ? '/admin/auction'
        : user?.role === 'moderator'
          ? '/moderator/auctions'
          : '/team-owner/auctions',
      icon: <Gavel className="h-5 w-5" />,
      roles: ['admin', 'moderator', 'team-owner'],
      activePattern: /^\/(?:admin|moderator|team-owner)?\/auctions?/,
    },
    // {
    //   label: 'Logs & Activity',
    //   href: user?.role === 'admin' 
    //     ? '/admin/logs'
    //     : user?.role === 'moderator'
    //       ? '/moderator/logs'
    //       : '/logs',
    //   icon: <ActivitySquare className="h-5 w-5" />,
    //   roles: ['admin', 'moderator'],
    //   activePattern: /^\/(?:admin|moderator)?\/logs/,
    // },
    {
      label: 'Settings',
      href: user?.role === 'admin' 
        ? '/admin/settings'
        : user?.role === 'moderator'
          ? '/moderator/settings'
          : '/settings',
      icon: <UserCog className="h-5 w-5" />,
      roles: ['admin', 'moderator'],
      activePattern: /^\/(?:admin|moderator)?\/settings/,
    },
  ];

  // Helper function to check if route is active
  const isActiveRoute = (item: NavItem): boolean => {
    if (item.activePattern) {
      return item.activePattern.test(pathname);
    }
    return pathname === item.href;
  };

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter(
    (item) => user?.role && item.roles.includes(user.role)
  );

  // Sidebar variants for animations
  const sidebarVariants:any = {
    expanded: {
      width: '240px',
      transition: { duration: 0.3, type: 'spring', stiffness: 100 }
    },
    collapsed: {
      width: '84px',
      transition: { duration: 0.3, type: 'spring', stiffness: 100 }
    }
  };

  // Mobile sidebar variants
  const mobileSidebarVariants:any = {
    open: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.3, type: 'spring', stiffness: 100 }
    },
    closed: {
      x: '-100%',
      opacity: 0,
      transition: { duration: 0.3, type: 'spring', stiffness: 100 }
    }
  };

  // Item variants for staggered animations
  const itemVariants:any = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.3,
        type: 'spring',
        stiffness: 100
      }
    })
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    const newExpandedState = !expanded;
    setExpanded(newExpandedState);
    if (onExpandedChange) {
      onExpandedChange(newExpandedState);
    }
  };

  return (
    <>
      {/* Mobile menu toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 rounded-full bg-gray-800/80 text-white backdrop-blur-md"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Desktop sidebar */}
      <motion.div
        className="hidden md:flex h-screen fixed left-0 top-0 z-50 flex-col"
        variants={sidebarVariants}
        animate={expanded ? 'expanded' : 'collapsed'}
      >
        <div className="h-full flex flex-col bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-md border-r border-gray-700/40 shadow-xl">
          {/* Header / Logo */}
          <div className="p-4 flex items-center justify-between border-b border-gray-700/50">
            {expanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text"
              >
                Auction Platform
              </motion.div>
            )}
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-full hover:bg-gray-700/50 text-gray-300 hover:text-white transition-colors"
            >
              {expanded ? (
                <ChevronLeft className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 py-6 px-3 flex flex-col space-y-2 overflow-y-auto custom-scrollbar">
            <AnimatePresence>
              {filteredNavItems.map((item, index) => (
                <motion.div
                  key={item.href}
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  variants={itemVariants}
                  className="w-full"
                >
                  <Link href={item.href}>
                    <div
                      className={cn(
                        "flex items-center rounded-2xl px-3 py-3 transition-all duration-300",
                        isActiveRoute(item)
                          ? "bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 text-white shadow-[0_0_15px_rgba(124,58,237,0.1)]"
                          : "hover:bg-gray-700/30 text-gray-300 hover:text-white"
                      )}
                    >
                      <div className={cn(
                        "p-1 rounded-xl",
                        isActiveRoute(item)
                          ? "text-white"
                          : "text-gray-400"
                      )}>
                        {item.icon}
                      </div>
                      
                      {expanded && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="ml-3 text-sm font-medium"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-700/50">
            <div className={cn(
              "p-3 rounded-2xl",
              expanded ? "bg-gray-800/70" : ""
            )}>
              {user && (
                <div className="flex items-center">
                  <div className="relative w-9 h-9 flex-shrink-0">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold shadow-lg">
                      {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </div>
                  </div>
                  
                  {expanded && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="ml-3 min-w-0"
                    >
                      <p className="text-sm font-medium text-white truncate">
                        {user.name || user.email?.split('@')[0]}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {user.role?.replace('-', ' ')}
                      </p>
                    </motion.div>
                  )}
                </div>
              )}
              
              {expanded && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={signOut}
                  className="mt-3 w-full py-2 px-3 text-sm rounded-xl text-gray-300 hover:text-white hover:bg-gray-700/50 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </motion.button>
              )}
              
              {!expanded && (
                <button
                  onClick={signOut}
                  className="mt-3 w-full flex justify-center py-2 text-gray-300 hover:text-white rounded-xl hover:bg-gray-700/50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="md:hidden fixed top-0 left-0 z-50 h-screen w-80"
            variants={mobileSidebarVariants}
            initial="closed"
            animate="open"
            exit="closed"
          >
            <div className="h-full flex flex-col bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-md border-r border-gray-700/40 shadow-xl">
              {/* Mobile header with close button */}
              <div className="p-4 flex items-center justify-between border-b border-gray-700/50">
                <div className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
                  Auction Platform
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-700/50 text-gray-300 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Mobile navigation */}
              <div className="flex-1 py-6 px-3 flex flex-col space-y-2 overflow-y-auto custom-scrollbar">
                <AnimatePresence>
                  {filteredNavItems.map((item, index) => (
                    <motion.div
                      key={item.href}
                      custom={index}
                      initial="hidden"
                      animate="visible"
                      variants={itemVariants}
                      className="w-full"
                    >
                      <Link href={item.href}>
                        <div
                          className={cn(
                            "flex items-center rounded-2xl px-3 py-3 transition-all duration-300",
                            isActiveRoute(item)
                              ? "bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 text-white shadow-[0_0_15px_rgba(124,58,237,0.1)]"
                              : "hover:bg-gray-700/30 text-gray-300 hover:text-white"
                          )}
                        >
                          <div className={cn(
                            "p-1 rounded-xl",
                            isActiveRoute(item)
                              ? "text-white"
                              : "text-gray-400"
                          )}>
                            {item.icon}
                          </div>
                          <span className="ml-3 text-sm font-medium">
                            {item.label}
                          </span>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Mobile user profile */}
              <div className="p-4 border-t border-gray-700/50">
                <div className="p-3 rounded-2xl bg-gray-800/70">
                  {user && (
                    <div className="flex items-center">
                      <div className="relative w-9 h-9 flex-shrink-0">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold shadow-lg">
                          {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                        </div>
                      </div>
                      <div className="ml-3 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {user.name || user.email?.split('@')[0]}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {user.role?.replace('-', ' ')}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={signOut}
                    className="mt-3 w-full py-2 px-3 text-sm rounded-xl text-gray-300 hover:text-white hover:bg-gray-700/50 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
} 