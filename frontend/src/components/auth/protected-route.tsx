'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If true, only allows access to unauthenticated users (for auth pages) */
  reverse?: boolean;
}

export function ProtectedRoute({ children, reverse = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If still loading, don't do anything yet
    if (loading) return;

    // If this is a reverse protected route (only for unauthenticated users)
    // and the user is authenticated, redirect to dashboard
    // Note: The OrganizationCheck component will handle redirecting to org creation if needed
    if (reverse && user) {
      router.replace('/dashboard');
    }
    // If this is a normal protected route (only for authenticated users)
    // and the user is not authenticated, redirect to signin
    else if (!reverse && !user) {
      router.replace('/auth/signin');
    }
  }, [user, loading, reverse, router]);

  // Show loading state while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication status...</p>
        </div>
      </div>
    );
  }

  // If this is a reverse protected route (auth pages) and user is authenticated, don't render children
  if (reverse && user) {
    return null;
  }
  // If this is a normal protected route (dashboard) and user is not authenticated, don't render children
  if (!reverse && !user) {
    return null;
  }

  // If all conditions are met, render children
  return <>{children}</>;
}