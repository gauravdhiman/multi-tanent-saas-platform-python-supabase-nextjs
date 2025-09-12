// components/dashboard/dummy-org-notification.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/auth-context';
import { organizationService } from '@/services/organization-service';
import { isDummyOrganization } from '@/lib/organization-utils';
import Link from 'next/link';

interface DummyOrgNotificationProps {
  onDismiss?: () => void;
}

export function DummyOrgNotification({ onDismiss }: DummyOrgNotificationProps) {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [isDummyOrg, setIsDummyOrg] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkDummyOrganization = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        // Get user's organizations
        const organizations = await organizationService.getUserOrganizations();
        
        if (organizations.length > 0) {
          const org = organizations[0];
          setOrgName(org.name);
          
          // Check if this is a dummy organization using the utility function
          setIsDummyOrg(isDummyOrganization(org));
        }
      } catch (error) {
        console.error('Error checking organization status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkDummyOrganization();
  }, [user]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (loading || !isVisible || !isDummyOrg) {
    return null;
  }

  return (
    <Alert className="border-yellow-200 bg-yellow-50 mb-6 relative">
      <AlertCircle className="h-5 w-5 text-yellow-600" />
      <AlertDescription className="text-yellow-800">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pr-8">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-base mb-1">Complete Your Organization Setup</p>
            <p className="text-sm text-yellow-700 leading-relaxed">
              Your organization &quot;{orgName}&quot; is using default information. 
              Update your organization details for a better experience.
            </p>
          </div>
          <div className="flex items-center lg:ml-4">
            <Link 
              href="/settings/organization" 
              className="inline-flex items-center text-sm font-medium text-yellow-700 hover:text-yellow-900 bg-yellow-100 hover:bg-yellow-200 px-4 py-2 rounded-md transition-colors whitespace-nowrap"
            >
              Update Now
              <ExternalLink className="ml-2 h-3 w-3" />
            </Link>
          </div>
        </div>
      </AlertDescription>
      <Button 
        variant="ghost" 
        size="sm"
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-yellow-700 hover:bg-yellow-100 h-8 w-8 p-0"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
}