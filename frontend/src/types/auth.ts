/**
 * Authentication-related type definitions
 */

import { Organization } from './organization';
import { UserRoleAssignment } from './rbac';

// Supabase types (to avoid importing the entire library in types)
export interface SupabaseProvider {
  provider: string;
}

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: unknown;
}

// Auth user (matches Supabase auth schema)
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailConfirmedAt?: string;
  createdAt: string;
  updatedAt: string;
  roles?: UserRoleAssignment[];
  hasRole: (roleName: string, organizationId?: string) => boolean;
  hasPermission: (permissionName: string, organizationId?: string) => boolean;
}

// Auth session
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

// Sign up form data
export interface SignUpData {
  email: string;
  password: string;
  passwordConfirm: string;
  firstName: string;
  lastName: string;
}

// Sign in form data
export interface SignInData {
  email: string;
  password: string;
}

// Complete auth user with organization context
export interface AuthUserWithOrganization {
  user: AuthUser;
  organization: Organization;
  accessToken: string;
}

// Auth context type (using any for Supabase compatibility)
export interface AuthContextType {
  user: AuthUser | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any;
  loading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signUp: (data: SignUpData) => Promise<{ user?: AuthUser; error: any }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signIn: (data: SignInData) => Promise<{ error: any }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signInWithOAuth: (provider: any) => Promise<{ error: any }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signOut: () => Promise<{ error: any }>;
  isAuthenticated: boolean;
  refreshUserProfile: () => Promise<void>;
}

// Auth provider props
export interface AuthProviderProps {
  children: React.ReactNode;
}

// Protected route props
export interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If true, only allows access to unauthenticated users (for auth pages) */
  reverse?: boolean;
}

// Organization check props
export interface OrganizationCheckProps {
  children: React.ReactNode;
}

// Organization creation form props
export interface OrganizationCreationFormProps {
  onSkip?: () => void;
  onSuccess?: () => void;
}
