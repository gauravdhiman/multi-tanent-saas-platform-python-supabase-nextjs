'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useOrganization } from '@/contexts/organization-context';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { OrganizationCheckProps } from '@/types/auth';

export function OrganizationCheck({ children }: OrganizationCheckProps) {
  const { user, loading: authLoading } = useAuth();
  const { organizations, loading: orgLoading, error: orgError, refreshOrganizations } = useOrganization();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasRefreshed, setHasRefreshed] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const checkOrganization = async () => {
      if (authLoading || orgLoading || !user || redirecting) {
        return;
      }

      // If there's an error loading organizations, allow access but log the issue
      if (orgError) {
        console.warn('Error loading organizations in OrganizationCheck, allowing access:', orgError);
        setChecking(false);
        return;
      }

      if (organizations.length === 0) {
        if (!hasRefreshed) {
          // Try to refresh organizations in case they were just created
          setHasRefreshed(true);
          try {
            await refreshOrganizations();
          } catch (err) {
            console.error('Error refreshing organizations:', err);
          }
          // After refresh, the useEffect will run again with updated organizations
          return;
        } else {
          // Already refreshed and still no organizations, redirect to creation
          setRedirecting(true);
          router.replace('/auth/create-organization');
          return;
        }
      }

      setChecking(false);
    };

    checkOrganization();
  }, [user, authLoading, orgLoading, organizations, orgError, router, refreshOrganizations, hasRefreshed, redirecting]);

  // Show loading state while checking
  if (authLoading || orgLoading || checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Checking your organization status...</p>
        </div>
      </div>
    );
  }

  // If user doesn't have an organization, don't render children (they'll be redirected)
  if (!checking && organizations.length === 0) {
    return null;
  }

  // If user has an organization, render children
  return <>{children}</>;
}
