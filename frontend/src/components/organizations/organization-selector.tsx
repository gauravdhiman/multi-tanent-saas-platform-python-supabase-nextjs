'use client';

import React from 'react';
import { useOrganization } from '@/contexts/organization-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, Loader2 } from 'lucide-react';

interface OrganizationSelectorProps {
  className?: string;
}

export function OrganizationSelector({ className }: OrganizationSelectorProps) {
  const { 
    organizations, 
    currentOrganization, 
    setCurrentOrganization, 
    loading 
  } = useOrganization();

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading organizations...</span>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">No organizations found</span>
      </div>
    );
  }

  if (organizations.length === 1) {
    // Only one organization, show it as a badge
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Building2 className="h-4 w-4" />
        <Badge variant="outline" className="text-sm">
          {currentOrganization?.name || organizations[0].name}
        </Badge>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Building2 className="h-4 w-4" />
      <Select
        value={currentOrganization?.id || ''}
        onValueChange={(value) => {
          const selectedOrg = organizations.find(org => org.id === value);
          if (selectedOrg) {
            setCurrentOrganization(selectedOrg);
          }
        }}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select organization" />
        </SelectTrigger>
        <SelectContent>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              <div className="flex items-center justify-between w-full">
                <span>{org.name}</span>
                {!org.is_active && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Inactive
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}