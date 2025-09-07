'use client';

/**
 * Authentication context using React Context and React Query.
 * Provides authentication state and methods throughout the application.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError, Provider } from '@supabase/supabase-js';
import { supabase, AuthUser, SignUpData, SignInData } from '@/lib/supabase';
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

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signUp: (data: SignUpData) => Promise<{ error: AuthError | null }>;
  signIn: (data: SignInData) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (provider: Provider) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session ? transformSupabaseUser(session.user) : null);
      setLoading(false);
      logInfo('Auth session initialized', {
        hasSession: !!session,
        userId: session?.user?.id
      });
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session ? transformSupabaseUser(session.user) : null);
      setLoading(false);
      
      // Log auth state changes with OpenTelemetry logger
      logInfo('Auth state changed', {
        event,
        hasSession: !!session,
        userId: session?.user?.id
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  // Transform Supabase user to our AuthUser type
  const transformSupabaseUser = (user: User): AuthUser => {
    const metadata = user.user_metadata || {};
    return {
      id: user.id,
      email: user.email || '',
      firstName: metadata.first_name || metadata.full_name?.split(' ')[0] || '',
      lastName: metadata.last_name || metadata.full_name?.split(' ').slice(1).join(' ') || '',
      emailConfirmedAt: user.email_confirmed_at || undefined,
      createdAt: user.created_at || '',
      updatedAt: user.updated_at || '',
    };
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
          redirectTo: `${window.location.origin}/dashboard`,
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

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    isAuthenticated: !!user,
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