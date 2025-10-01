// app/auth/oauth/callback/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { organizationService } from '@/services/organization-service';
import { supabase } from '@/lib/supabase';
import { extractFirstLastName } from '@/lib/user-utils';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshUserProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
 const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Prevent multiple executions
      if (hasRun) {
        return;
      }
      // Wait for auth to fully initialize
      if (authLoading) {
        return;
      }

      // Mark as running to prevent multiple executions
      setHasRun(true);

      // If no user after auth is done loading, it's an auth failure
      if (!user) {
        // Give a bit more time for potential delayed auth state updates
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (!user) {
          setError('Authentication failed. Please try signing in again.');
          setIsProcessing(false);
          return;
        }
      }

      // Update user metadata to ensure first_name and last_name are properly set
      try {
        const currentUser = await supabase.auth.getUser();
        if (currentUser.data?.user) {
          const userMetadata = currentUser.data.user.user_metadata || {};
          
          // Always extract first_name and last_name using utility function to ensure consistency
          const { firstName: extractedFirstName, lastName: extractedLastName } = extractFirstLastName(userMetadata);
          
          // Update user metadata with extracted names if they differ from current values
          const currentFirstName = userMetadata.first_name || '';
          const currentLastName = userMetadata.last_name || '';
          
          if (extractedFirstName !== currentFirstName || extractedLastName !== currentLastName) {
            const { error: updateError } = await supabase.auth.updateUser({
              data: {
                ...userMetadata,
                first_name: extractedFirstName,
                last_name: extractedLastName,
              }
            });
            
            if (updateError) {
              console.error('Error updating user metadata:', updateError);
            } else {
              // Refresh the user profile to get the updated data
              await refreshUserProfile();
            }
          }
        }
      } catch (updateError) {
        console.error('Error processing OAuth user metadata:', updateError);
      }

      // Add a small delay to ensure auth is fully settled
      await new Promise(resolve => setTimeout(resolve, 300));

      // Check if user already has organizations
      try {
        const organizations = await organizationService.getUserOrganizations();
        
        // If user already has organizations, redirect to dashboard
        if (organizations.length > 0) {
          router.replace('/dashboard');
          return;
        }
        
        // If user has no organizations, redirect to organization creation
        router.replace('/auth/create-organization');
      } catch (err) {
        console.error('Error handling OAuth callback:', err);
        
        // Check if it's an auth-related error (token not ready, etc.)
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (errorMessage.includes('session') || errorMessage.includes('token') || errorMessage.includes('auth')) {
          // Likely an auth timing issue, wait a bit longer and retry
          console.log('Auth-related error, retrying...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          try {
            const retryOrganizations = await organizationService.getUserOrganizations();
            if (retryOrganizations.length > 0) {
              router.replace('/dashboard');
            } else {
              router.replace('/auth/create-organization');
            }
            return;
          } catch (retryErr) {
            console.error('Retry failed:', retryErr);
          }
        }
        
        setError('Failed to set up your organization. Please contact support.');
        setIsProcessing(false);
      }
    };

    handleOAuthCallback();
  }, [user, authLoading, router, hasRun, refreshUserProfile]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="mx-auto bg-red-100 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">OAuth Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/auth/signin')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while processing
  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="mx-auto bg-blue-100 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-90 mb-2">Completing Sign In...</h1>
            <p className="text-gray-600">Please wait while we complete your sign in and set up your account.</p>
          </div>
        </div>
      </div>
    );
  }

  // This should rarely be reached since we redirect on success
  return null;
}
