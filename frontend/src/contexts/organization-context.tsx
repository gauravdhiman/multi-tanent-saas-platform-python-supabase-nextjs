'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Organization } from '@/types/organization';
import { useAuth } from '@/contexts/auth-context';
import { useUserOrganizations } from '@/hooks/use-organizations';

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
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [currentOrganization, setCurrentOrganizationState] = useState<Organization | null>(null);
  
  // Use React Query for organizations data
  const { 
    data: organizations = [], 
    isLoading: loading, 
    error: queryError,
    refetch 
  } = useUserOrganizations();

  // Convert React Query error to string for consistency with existing interface
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load organizations') : null;

  // Auto-select the first organization if user has organizations but no current selection
  useEffect(() => {
    if (organizations.length > 0 && !currentOrganization) {
      setCurrentOrganizationState(organizations[0]);
    }
  }, [organizations, currentOrganization]);

  // Clear current organization when not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setCurrentOrganizationState(null);
    }
  }, [isAuthenticated, authLoading]);

  const setCurrentOrganization = (org: Organization) => {
    setCurrentOrganizationState(org);
    // Optionally persist to localStorage for session persistence
    localStorage.setItem('currentOrganizationId', org.id);
  };

  const refreshOrganizations = async () => {
    await refetch();
  };

  // Restore current organization from localStorage on mount
  useEffect(() => {
    if (organizations.length > 0) {
      const savedOrgId = localStorage.getItem('currentOrganizationId');
      if (savedOrgId) {
        const savedOrg = organizations.find(org => org.id === savedOrgId);
        if (savedOrg) {
          setCurrentOrganizationState(savedOrg);
        }
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