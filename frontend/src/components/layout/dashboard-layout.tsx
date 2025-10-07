'use client';

import React, { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useOrganization } from '@/contexts/organization-context';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  CreditCard, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  LogOut,
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
    name: 'Users',
    href: '/users',
    icon: Users,
 },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const { organizations, currentOrganization } = useOrganization();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      router.push('/auth/signin');
    }
  };

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getBreadcrumbs = () => {
    const breadcrumbs = [];
    
    // Extract orgId from the search params
    const orgId = searchParams.get('org_id');
    
    if (pathname === '/dashboard') {
      breadcrumbs.push({ name: 'Dashboard', href: null });
    } else if (pathname === '/organizations') {
      breadcrumbs.push({ name: 'Organizations', href: null });
    } else if (pathname === '/organization') {
      breadcrumbs.push({ name: 'Organization', href: null });
    } else if (pathname === '/organization/members') {
      const orgHref = orgId ? `/organization?org_id=${orgId}` : '/organization';
      breadcrumbs.push({ name: 'Organization', href: orgHref });
      breadcrumbs.push({ name: 'Members', href: null });
    } else if (pathname === '/organization/settings') {
      const orgHref = orgId ? `/organization?org_id=${orgId}` : '/organization';
      breadcrumbs.push({ name: 'Organization', href: orgHref });
      breadcrumbs.push({ name: 'Settings', href: null });
    } else if (pathname === '/users') {
      breadcrumbs.push({ name: 'Users', href: null });
    } else if (pathname === '/organization/billing') {
      const orgHref = orgId ? `/organization?org_id=${orgId}` : '/organization';
      breadcrumbs.push({ name: 'Organization', href: orgHref });
      breadcrumbs.push({ name: 'Billing', href: null });
    } else if (pathname === '/settings') {
      breadcrumbs.push({ name: 'Settings', href: null });
    } else if (pathname.startsWith('/organization')) {
      // Handle dynamic organization routes
      const orgHref = orgId ? `/organization?org_id=${orgId}` : '/organization';
      if (pathname.includes('/members')) {
        breadcrumbs.push({ name: 'Organization', href: orgHref });
        breadcrumbs.push({ name: 'Members', href: null });
      } else if (pathname.includes('/settings')) {
        breadcrumbs.push({ name: 'Organization', href: orgHref });
        breadcrumbs.push({ name: 'Settings', href: null });
      } else {
        breadcrumbs.push({ name: 'Organization', href: null });
      }
    } else {
      breadcrumbs.push({ name: 'Dashboard', href: null });
    }
    
    return breadcrumbs;
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
              (item.href === '/organizations' && pathname.startsWith('/organizations'));

            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
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
      </div>

      {/* Main Content Area - Fixed height */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header - Fixed */}
        <header className="bg-card shadow-sm border-b border-border flex-shrink-0">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <nav className="flex" aria-label="Breadcrumb">
                  <ol className="inline-flex items-center space-x-1 md:space-x-2">
                    {getBreadcrumbs().map((breadcrumb, index) => (
                      <li key={index} className="inline-flex items-center">
                        {index > 0 && (
                          <svg className="w-3 h-3 text-muted-foreground mx-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                          </svg>
                        )}
                        {breadcrumb.href ? (
                          <button
                            onClick={() => router.push(breadcrumb.href!)}
                            className="text-xl font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            {breadcrumb.name}
                          </button>
                        ) : (
                          <span className="text-xl font-semibold text-foreground">
                            {breadcrumb.name}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  Welcome, {user?.firstName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.email}
                </p>
              </div>
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-500 text-white">
                        {user?.firstName ? getInitials(`${user.firstName} ${user.lastName || ''}`) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => router.push('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  {currentOrganization && user && (user.hasRole('platform_admin') || user.hasRole('org_admin', currentOrganization.id)) && (
                    <>
                      <DropdownMenuSeparator />
                      {organizations.length > 1 && (
                        <DropdownMenuItem onClick={() => router.push('/organizations')}>
                          <Building2 className="mr-2 h-4 w-4" />
                          <span>Organizations</span>
                        </DropdownMenuItem>
                      )}
                      {organizations.length === 1 && currentOrganization && (
                        <>
                          <DropdownMenuItem onClick={() => router.push(`/organization?org_id=${currentOrganization.id}`)}>
                            <Building2 className="mr-2 h-4 w-4" />
                            <span>Organization</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/organization/settings?org_id=${currentOrganization.id}`)}>
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Org Settings</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/organization/members?org_id=${currentOrganization.id}`)}>
                            <Users className="mr-2 h-4 w-4" />
                            <span>Members</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/organization/billing?org_id=${currentOrganization.id}`)}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            <span>Billing & Subscriptions</span>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
