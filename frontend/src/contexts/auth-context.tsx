'use client';

/**
 * Authentication context using React Context and React Query.
 * Provides authentication state and methods throughout the application.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, Provider } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { AuthUser, SignUpData, SignInData, AuthContextType, AuthProviderProps } from '@/types/auth';
import type { UserRoleAssignment } from '@/types/rbac';
import { useUserProfile } from '@/hooks/use-user-profile';
import { extractFirstLastName } from '@/lib/user-utils';

import { getMeter } from '@/lib/opentelemetry';
import {
  withTelemetrySignUp,
  withTelemetrySignIn,
  withTelemetrySignInWithOAuth,
  withTelemetrySignOut,
  logInfo,
  recordMetric
} from '@/lib/opentelemetry-helpers';

// Get meter for authentication operations
const meter = getMeter('auth-context');

export class EmailNotVerifiedError extends Error {
  constructor(public user: { id: string; email: string; email_confirmed_at: null }) {
    super('EMAIL_NOT_VERIFIED');
    this.name = 'EmailNotVerifiedError';
  }
}

// Create metrics only if meter is available
const authAttemptsCounter = meter?.createCounter('auth_attempts', {
  description: 'Number of authentication attempts',
});

const authSuccessCounter = meter?.createCounter('auth_success', {
  description: 'Number of successful authentications',
});

const authFailureCounter = meter?.createCounter('auth_failures', {
  description: 'Number of failed authentications',
});

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Transform Supabase user to our AuthUser type
  const transformSupabaseUser = (user: User, roles?: UserRoleAssignment[]): AuthUser => {
    const metadata = user.user_metadata || {};

    // Extract first_name and last_name using utility function
    const { firstName, lastName } = extractFirstLastName(metadata);

    const authUser: AuthUser = {
      id: user.id,
      email: user.email || '',
      firstName,
      lastName,
      emailConfirmedAt: user.email_confirmed_at || undefined,
      createdAt: user.created_at || '',
      updatedAt: user.updated_at || '',
      roles,
      hasRole: (roleName: string, organizationId?: string) => {
        if (!roles) return false;
        for (const userRole of roles) {
          if (userRole.role.name === roleName) {
            // If organization_id is specified, check if role is for that organization
            if (organizationId) {
              if (userRole.organization_id === organizationId) {
                return true;
              }
            } else {
              // For platform-wide roles (organization_id is null)
              if (roleName === "platform_admin" && userRole.organization_id === null) {
                return true;
              }
            }
          }
        }
        return false;
      },
      hasPermission: (permissionName: string, organizationId?: string) => {
        if (!roles) return false;
        for (const userRole of roles) {
          for (const permission of userRole.role.permissions) {
            if (permission.name === permissionName) {
              // If organization_id is specified, check if role is for that organization
              if (organizationId) {
                if (userRole.organization_id === organizationId) {
                  return true;
                }
              } else {
                // For platform-wide permissions
                if (userRole.role.name === "platform_admin" && userRole.organization_id === null) {
                  return true;
                }
              }
            }
          }
        }
        return false;
      },
    };

    return authUser;
  };

  // Use React Query for user profile data
  const { 
    data: userRoles, 
    isLoading: profileLoading, 
    refetch: refetchProfile 
  } = useUserProfile(session?.user?.id);
  
  // Derive user state from session and userRoles
  const user = session?.user && userRoles !== undefined 
    ? transformSupabaseUser(session.user, userRoles) 
    : null;
  
  // Derive loading state - don't show as loaded until auth is initialized
  const loading = !isInitialized || (session?.user ? profileLoading : false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get initial session from localStorage (no network call)
        // This only reads from browser storage and validates JWT locally
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!error && session) {
          setSession(session);
          logInfo('Auth session restored from storage', {
            hasSession: true,
            userId: session.user?.id,
            source: 'localStorage',
            expiresAt: session.expires_at
          });
        } else {
          // This is normal for:
          // - First-time visitors
          // - Users who logged out
          // - Expired sessions that were cleared
          logInfo('No valid session in storage - user needs to log in', {
            hasSession: false,
            source: 'localStorage',
            reason: error?.message || 'No session found'
          });
        }
      } catch (error) {
        // This would only happen if localStorage is unavailable
        console.warn('Failed to access session storage:', error);
        logInfo('Auth session initialization failed', {
          hasSession: false,
          error: error instanceof Error ? error.message : 'Storage unavailable'
        });
      } finally {
        // Always mark as initialized so app can show login screen if needed
        setIsInitialized(true);
      }
    };

    // Initialize auth state
    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsInitialized(true);
      
      // Log auth state changes with OpenTelemetry logger
      logInfo('Auth state changed', {
        event: _event,
        hasSession: !!session,
        userId: session?.user?.id,
        source: 'auth_change'
      });
    });

    return () => subscription.unsubscribe();
  }, []);


  // Sign up with email and password
 const signUp = withTelemetrySignUp(
    async (data: SignUpData) => {
      recordMetric(authAttemptsCounter, 1, { operation: 'signup', source: 'frontend' });
      
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
          },
        },
      });

      if (error) {
        recordMetric(authFailureCounter, 1, { operation: 'signup', error: error.status || 'unknown' });
        throw error;
      } else {
        recordMetric(authSuccessCounter, 1, { operation: 'signup' });
      }

      // Transform the signed up user data to our AuthUser type
      let signedUpUser = null;
      if (signUpData.user) {
        signedUpUser = transformSupabaseUser(signUpData.user, []);
      }

      return { user: signedUpUser, error };
    },
    { name: 'auth.signup', attributes: { operation: 'signup' } },
    { operation: 'Signup', attributes: { operation: 'signup' } }
  );

  // Sign in with email and password
  const signIn = withTelemetrySignIn(
    async (data: SignInData) => {
      recordMetric(authAttemptsCounter, 1, { operation: 'signin', source: 'frontend' });

      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        recordMetric(authFailureCounter, 1, { operation: 'signin', error: error.status || 'unknown' });
        throw error;
      }

      // Check if user is verified after successful signin
      if (signInData.user && !signInData.user.email_confirmed_at) {
        // Sign out the unverified user but return their info for resend functionality
        const unverifiedUserInfo = {
          id: signInData.user.id,
          email: signInData.user.email || '',
          email_confirmed_at: null
        };
        await supabase.auth.signOut();
        recordMetric(authFailureCounter, 1, { operation: 'signin', error: 'email_not_verified' });

        // Throw custom error with user info
        throw new EmailNotVerifiedError(unverifiedUserInfo);
      }

      recordMetric(authSuccessCounter, 1, { operation: 'signin' });
      return { error: null };
    },
    { name: 'auth.signin', attributes: { operation: 'signin' } },
    { operation: 'Signin', attributes: { operation: 'signin' } }
  );

  // Sign in with OAuth provider
  const signInWithOAuth = withTelemetrySignInWithOAuth(
    async (provider: Provider) => {
      recordMetric(authAttemptsCounter, 1, { operation: 'oauth_signin', source: 'frontend' });
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/oauth/callback`,
        },
      });

      if (error) {
        recordMetric(authFailureCounter, 1, { operation: 'oauth_signin', error: error.status || 'unknown' });
        throw error;
      } else {
        recordMetric(authSuccessCounter, 1, { operation: 'oauth_signin' });
      }

      // The OAuth flow will redirect the user, so we don't need to handle the response here
      return { error: null };
    },
    { name: 'auth.oauth_signin', attributes: { operation: 'oauth_signin' } },
    { operation: 'OAuth Signin', attributes: { operation: 'oauth_signin' } }
  );

  // Sign out
  const signOut = withTelemetrySignOut(
    async () => {
      recordMetric(authAttemptsCounter, 1, { operation: 'signout', source: 'frontend' });
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        recordMetric(authFailureCounter, 1, { operation: 'signout', error: error.status || 'unknown' });
        throw error;
      } else {
        recordMetric(authSuccessCounter, 1, { operation: 'signout' });
      }

      return { error };
    },
    { name: 'auth.signout', attributes: { operation: 'signout' } },
    { operation: 'Signout', attributes: { operation: 'signout' } }
  );

  // Refresh user profile from backend using React Query
  const refreshUserProfile = async () => {
    if (!session?.user?.id) return;
    
    try {
      await refetchProfile();
    } catch (error) {
      console.warn('Failed to refresh user profile:', error);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    isAuthenticated: !!user,
    refreshUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
