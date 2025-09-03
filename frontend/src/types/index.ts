// Core user types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// Organization/Tenant types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: string;
  updatedAt: string;
}

// Auth types
export interface AuthUser {
  user: User;
  organization: Organization;
  accessToken: string;
}

// API Response types
export interface ApiResponse<T = Record<string, unknown>> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// Component prop types
export interface BaseProps {
  className?: string;
  children?: React.ReactNode;
}