'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Building, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/auth-context';
import { useOrganization } from '@/contexts/organization-context';
import { useRouter } from 'next/navigation';
import { organizationService } from '@/services/organization-service';
import { createDummyOrganizationData } from '@/lib/organization-utils';

const organizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  slug: z.string().min(1, 'Slug is required').max(100, 'Slug must be less than 100 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

import type { OrganizationCreationFormProps } from '@/types/auth';

export function OrganizationCreationForm({ onSkip, onSuccess }: OrganizationCreationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitingForOrg, setWaitingForOrg] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: user?.firstName ? `${user.firstName}'s Organization` : '',
      slug: user?.id ? `${user.id.substring(0, 8)}-org` : '',
    }
  });
  
  const name = watch('name');

  const { refreshOrganizations } = useOrganization();
  
  const waitForOrganization = async () => {
    setWaitingForOrg(true);
    const maxAttempts = 10; // 5 seconds with 500ms intervals
    for (let i = 0; i < maxAttempts; i++) {
      try {
        // Refresh the organization context
        await refreshOrganizations();
        
        // Check if organizations are now available in context
        const orgs = await organizationService.getUserOrganizations();
        if (orgs.length > 0) {
          // Organization found, redirect
          if (onSuccess) {
            onSuccess();
          } else {
            router.push('/dashboard');
          }
          return;
        }
      } catch (err) {
        console.error('Error checking organizations:', err);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    // If still no organization after waiting, redirect anyway
    if (onSuccess) {
      onSuccess();
    } else {
      router.push('/dashboard');
    }
  };

  React.useEffect(() => {
    // Auto-generate slug when name changes
    if (name) {
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);
      
      if (generatedSlug) {
        // Update slug field
        const slugField = document.getElementById('slug') as HTMLInputElement;
        if (slugField && !slugField.value) {
          slugField.value = generatedSlug;
        }
      }
    }
  }, [name]);
  
  const onSubmit = async (data: OrganizationFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Call the backend API to create the organization using the self endpoint
      const result = await organizationService.createSelfOrganization({
        name: data.name,
        description: data.description,
        slug: data.slug,
        is_active: true
      });
      
      console.log('Organization created:', result);

      // Wait for the organization to be available before redirecting
      await waitForOrganization();
    } catch (err) {
      console.error('Organization creation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create organization. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSkip = async () => {
    if (!onSkip) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Create a default organization with dummy values using the utility function
      const defaultOrgData = createDummyOrganizationData({
        firstName: user?.firstName,
        email: user?.email,
        id: user?.id
      });
      
      // Call the backend API to create the default organization
      const result = await organizationService.createSelfOrganization(defaultOrgData);
      
      console.log('Default organization created:', result);
      // Wait for the organization to be available before redirecting
      await waitForOrganization();
    } catch (err) {
      console.error('Default organization creation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create default organization. Please try again.');
      setIsLoading(false);
    }
  };
  
  if (waitingForOrg) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto bg-blue-100 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Setting up your organization...</h1>
          <p className="text-gray-600">Please wait while we finalize your setup.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="mx-auto bg-blue-100 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
          <Building className="h-8 w-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Your Organization</h1>
        <p className="text-gray-600">Set up your organization with your details, or skip to use default settings</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="name" className="text-gray-700">Organization Name</Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Enter organization name"
            disabled={isLoading}
            className="text-gray-900"
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description" className="text-gray-700">Description (Optional)</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Describe your organization"
            rows={3}
            disabled={isLoading}
            className="text-gray-900 bg-white focus-visible:ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          />
          {errors.description && (
            <p className="text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="slug" className="text-gray-700">Organization Slug</Label>
          <Input
            id="slug"
            {...register('slug')}
            placeholder="unique-identifier"
            disabled={isLoading}
            className="text-gray-900"
          />
          {errors.slug && (
            <p className="text-sm text-red-600">{errors.slug.message}</p>
          )}
          <p className="text-xs text-gray-500">
            This will be used in your organization&apos;s URL. Use lowercase letters, numbers, and hyphens only.
          </p>
        </div>
        
        <div className="flex flex-col gap-3 pt-4">
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Organization...
              </>
            ) : (
              'Create Organization'
            )}
          </Button>
          
          {onSkip && (
            <Button
              type="button"
              variant="outline"
              onClick={handleSkip}
              disabled={isLoading}
              className="w-full flex items-center justify-center text-gray-700 border-gray-300 bg-white hover:bg-gray-50 hover:text-gray-800"
            >
              <SkipForward className="mr-2 h-4 w-4" />
              Skip and Use Default Settings
            </Button>
          )}
        </div>
        
        {onSkip && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-xs text-gray-700 text-center">
              If you skip, we&apos;ll create an organization with default settings. 
              You can update these details later in your organization settings.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
