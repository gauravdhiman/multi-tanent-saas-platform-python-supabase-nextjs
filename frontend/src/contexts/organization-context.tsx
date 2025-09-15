'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Organization } from '@/types/organization';
import { organizationService } from '@/services/organization-service';
import { useAuth } from '@/contexts/auth-context';

interface OrganizationContextType {
  organizations: Organization[];
  currentOrganization: Organization | null;
  loading: boolean;
  error: string | null;
  setCurrentOrganization: (org: Organization) => void;
  refreshOrganizations: () => Promise<void>;
}

interface OrganizationProviderProps {
  children: ReactNode;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganizationState] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const orgs = await organizationService.getUserOrganizations();
      setOrganizations(orgs);

      // Auto-select the first organization if user has organizations but no current selection
      if (orgs.length > 0 && !currentOrganization) {
        setCurrentOrganizationState(orgs[0]);
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }, [currentOrganization]);

  // Load organizations when user is authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading && user) {
      loadOrganizations();
    } else if (!authLoading && !isAuthenticated) {
      // Clear state when not authenticated
      setOrganizations([]);
      setCurrentOrganizationState(null);
      setLoading(false);
      setError(null);
    }
  }, [isAuthenticated, authLoading, user, loadOrganizations]);

  const setCurrentOrganization = (org: Organization) => {
    setCurrentOrganizationState(org);
    // Optionally persist to localStorage for session persistence
    localStorage.setItem('currentOrganizationId', org.id);
  };

  const refreshOrganizations = async () => {
    await loadOrganizations();
  };

  // Restore current organization from localStorage on mount
  useEffect(() => {
    const savedOrgId = localStorage.getItem('currentOrganizationId');
    if (savedOrgId && organizations.length > 0) {
      const savedOrg = organizations.find(org => org.id === savedOrgId);
      if (savedOrg) {
        setCurrentOrganizationState(savedOrg);
      }
    }
  }, [organizations]);

  const value: OrganizationContextType = {
    organizations,
    currentOrganization,
    loading,
    error,
    setCurrentOrganization,
    refreshOrganizations,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}