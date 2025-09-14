/**
 * Supabase client configuration for frontend authentication and database access.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// For development without Supabase configuration, we'll show warnings
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not set. Authentication features will not work.');
}

// Create and export Supabase client (will handle missing config gracefully)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// Import auth types from centralized location
import type { AuthUser, AuthSession, SignUpData, SignInData } from '@/types/auth';

// Re-export for backward compatibility
export type { AuthUser, AuthSession, SignUpData, SignInData };
