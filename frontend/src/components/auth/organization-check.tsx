'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { organizationService } from '@/services/organization-service';
import { Loader2 } from 'lucide-react';

interface OrganizationCheckProps {
  children: React.ReactNode;
}

export function OrganizationCheck({ children }: OrganizationCheckProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasOrganization, setHasOrganization] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const checkOrganization = async () => {
      if (authLoading || !user) {
        return;
      }

      // Add a small delay to ensure auth is fully settled
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        const organizations = await organizationService.getUserOrganizations();
        
        if (organizations.length === 0) {
          // User has no organizations, redirect to organization creation
          router.replace('/auth/create-organization');
          return;
        }
        
        setHasOrganization(true);
      } catch (error) {
        console.error('Error checking user organizations:', error);
        
        // Check if it's an auth-related error and we haven't retried too many times
        const errorMessage = error instanceof Error ? error.message : String(error);
        if ((errorMessage.includes('session') || errorMessage.includes('token') || errorMessage.includes('auth')) && retryCount < 2) {
          console.log(`Auth-related error in OrganizationCheck, retrying... (attempt ${retryCount + 1})`);
          setRetryCount(prev => prev + 1);
          // Wait a bit longer and retry
          setTimeout(() => {
            checkOrganization();
          }, 1000);
          return;
        }
        
        // On persistent error, still allow access but log the issue
        console.warn('Persistent error checking organizations, allowing access');
        setHasOrganization(true);
      } finally {
        setChecking(false);
      }
    };

    checkOrganization();
  }, [user, authLoading, router, retryCount]);

  // Show loading state while checking
  if (authLoading || checking) {
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
  if (!hasOrganization) {
    return null;
  }

  // If user has an organization, render children
  return <>{children}</>;
}