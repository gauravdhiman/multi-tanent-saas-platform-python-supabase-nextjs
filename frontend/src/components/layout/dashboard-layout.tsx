'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { organizationService } from '@/services/organization-service';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  CreditCard, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  LogOut,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import type { Organization } from '@/types/organization';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Organization',
    href: '/organization',
    icon: Building2,
  },
  {
    name: 'Users',
    href: '/users',
    icon: Users,
  },
  {
    name: 'Billing',
    href: '/billing',
    icon: CreditCard,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [, setLoading] = useState(true);

  const loadUserOrganization = useCallback(async () => {
    if (!user) return;
    try {
      const organizations = await organizationService.getUserOrganizations();
      if (organizations && organizations.length > 0) {
        setOrganization(organizations[0]); // Get the user's primary organization
      }
    } catch (error) {
      console.error('Error loading user organization:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { 
    loadUserOrganization();
  }, [loadUserOrganization]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      router.push('/auth/signin');
    }
  };

  const handleNavigation = (href: string) => {
    if (href === '/organization' && organization) {
      router.push('/organization');
    } else {
      router.push(href);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getCurrentPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname === '/organization') return 'Organization';
    if (pathname === '/organization/members') return 'Organization › Members';
    if (pathname === '/organization/settings') return 'Organization › Settings';
    if (pathname === '/organizations') return 'Organizations';
    if (pathname === '/users') return 'Users';
    if (pathname === '/billing') return 'Billing';
    if (pathname === '/settings') return 'Settings';
    
    // Handle dynamic routes
    if (pathname.startsWith('/organization')) {
      if (pathname.includes('/members')) return 'Organization › Members';
      if (pathname.includes('/settings')) return 'Organization › Settings';
      return 'Organization';
    }
    if (pathname.startsWith('/organizations')) return 'Organizations';
    
    return 'Dashboard';
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar - Fixed height, full viewport */}
      <div className={`bg-card border-r border-border shadow-lg transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'} flex flex-col h-full`}>
        {/* Sidebar Header - Fixed */}
        <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
          {!sidebarCollapsed && (
            <h2 className="text-lg font-semibold text-foreground">SaaS Platform</h2>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 h-8 w-8"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation - Scrollable if needed */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || 
              (item.href === '/organization' && pathname.startsWith('/organizations'));

            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                } ${sidebarCollapsed ? 'justify-center' : ''}`}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="font-medium">{item.name}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Menu - Fixed at bottom */}
        <div className="p-4 border-t border-border flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'px-2' : 'justify-start px-3'} h-auto py-2`}>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-500 text-white">
                      {user?.firstName ? getInitials(`${user.firstName} ${user.lastName || ''}`) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {!sidebarCollapsed && (
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content Area - Fixed height */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header - Fixed */}
        <header className="bg-card shadow-sm border-b border-border flex-shrink-0">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  {getCurrentPageTitle()}
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {user?.firstName}
              </span>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Page Content - Scrollable */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}