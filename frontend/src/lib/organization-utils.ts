/**
 * Utility functions for organization management
 */

// Minimal organization interface for dummy detection
export interface OrganizationForDetection {
  name: string;
  slug: string;
  description?: string | null;
}

/**
 * Check if an organization is a dummy/default organization
 * based on consistent keywords in name, description, or slug
 */
export function isDummyOrganization(org: OrganizationForDetection): boolean {
  const defaultKeyword = 'default';
  
  return (
    org.name.toLowerCase().includes(defaultKeyword) ||
    (org.description && org.description.toLowerCase().includes(defaultKeyword)) ||
    org.slug.includes(defaultKeyword)
  );
}

/**
 * Create dummy organization data with consistent default keywords
 */
export function createDummyOrganizationData(user: { firstName?: string; email?: string; id?: string }) {
  return {
    name: user?.firstName ? `${user.firstName}'s Default Organization` : 'My Default Organization',
    description: `Default organization for ${user?.email || 'new user'}`,
    slug: user?.id ? `${user.id.substring(0, 8)}-default-org` : `default-org-${Date.now()}`,
    is_active: true
  };
}