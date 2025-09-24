'use client';

/**
 * Authentication context using React Context and React Query.
 * Provides authentication state and methods throughout the application.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, Provider } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/api/client';
import type { AuthUser, SignUpData, SignInData, AuthContextType, AuthProviderProps } from '@/types/auth';
import type { UserRoleAssignment } from '@/types/rbac';
import type { ApiResponse } from '@/types/api';

interface UserProfileResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: UserRoleAssignment[];
}
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileCache, setProfileCache] = useState<Map<string, UserRoleAssignment[]>>(new Map());

    // Fetch user profile from backend API with caching
  const fetchUserProfile = useCallback(async (userId: string): Promise<UserRoleAssignment[] | undefined> => {
    // Check cache first
    if (profileCache.has(userId)) {
      return profileCache.get(userId);
    }

    try {
      const response: ApiResponse<UserProfileResponse> = await apiClient.get(`/auth/me`);
      const userData = response.data;
      if (userData && userData.roles) {
        // Cache the result
        setProfileCache(prev => new Map(prev).set(userId, userData.roles));
        return userData.roles;
      }
    } catch (error) {
      console.warn('Failed to fetch user profile from backend:', error);
    }
    return undefined;
  }, [profileCache]);
  
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        // Fetch user profile with roles from backend
        const roles = await fetchUserProfile(session.user.id);
        setUser(transformSupabaseUser(session.user, roles));
      } else {
        setUser(null);
      }
      setLoading(false);
      logInfo('Auth session initialized', {
        hasSession: !!session,
        userId: session?.user?.id
      });
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        // Fetch user profile with roles from backend
        const roles = await fetchUserProfile(session.user.id);
        setUser(transformSupabaseUser(session.user, roles));
      } else {
        setUser(null);
      }
      setLoading(false);

      // Log auth state changes with OpenTelemetry logger
      logInfo('Auth state changed', {
        event: _event,
        hasSession: !!session,
        userId: session?.user?.id
      });
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  // Transform Supabase user to our AuthUser type
  const transformSupabaseUser = (user: User, roles?: UserRoleAssignment[]): AuthUser => {
    const metadata = user.user_metadata || {};

    const authUser: AuthUser = {
      id: user.id,
      email: user.email || '',
      firstName: metadata.first_name || metadata.full_name?.split(' ')[0] || '',
      lastName: metadata.last_name || metadata.full_name?.split(' ').slice(1).join(' ') || '',
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

  // Sign up with email and password
  const signUp = withTelemetrySignUp(
    async (data: SignUpData) => {
      recordMetric(authAttemptsCounter, 1, { operation: 'signup', source: 'frontend' });
      
      const { error } = await supabase.auth.signUp({
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

      return { error };
    },
    { name: 'auth.signup', attributes: { operation: 'signup' } },
    { operation: 'Signup', attributes: { operation: 'signup' } }
  );

  // Sign in with email and password
  const signIn = withTelemetrySignIn(
    async (data: SignInData) => {
      recordMetric(authAttemptsCounter, 1, { operation: 'signin', source: 'frontend' });
      
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        recordMetric(authFailureCounter, 1, { operation: 'signin', error: error.status || 'unknown' });
        throw error;
      } else {
        recordMetric(authSuccessCounter, 1, { operation: 'signin' });
      }

      return { error };
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

  // Refresh user profile from backend
  const refreshUserProfile = async () => {
    if (!session?.user?.id) return;

    try {
      // Clear cache for this user to force refresh
      setProfileCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(session.user.id);
        return newCache;
      });
      const roles = await fetchUserProfile(session.user.id);
      const updatedUser = transformSupabaseUser(session.user, roles);
      setUser(updatedUser);
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