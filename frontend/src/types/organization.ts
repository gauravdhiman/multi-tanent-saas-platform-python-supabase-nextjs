/**
 * Organization-related type definitions
 */

// Base Organization interface with all possible fields
export interface Organization {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  website: string | null;
  plan?: 'free' | 'pro' | 'enterprise';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// For organization creation (subset of Organization)
export interface OrganizationCreate {
  name: string;
  description?: string;
  slug: string;
  website?: string;
  is_active?: boolean;
}

// For organization updates (partial Organization)
export interface OrganizationUpdate {
  name?: string;
  description?: string | null;
  slug?: string;
  website?: string | null;
  is_active?: boolean;
}

// Minimal organization interface for utility functions
export interface OrganizationForDetection {
  name: string;
  slug: string;
  description?: string | null;
}

// Organization with member count (for listings)
export interface OrganizationWithStats extends Organization {
  memberCount?: number;
  activeProjects?: number;
}