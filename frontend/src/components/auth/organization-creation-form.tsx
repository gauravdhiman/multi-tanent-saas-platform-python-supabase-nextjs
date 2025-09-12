'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Building, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/auth-context';
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

interface OrganizationCreationFormProps {
  onSkip?: () => void;
  onSuccess?: () => void;
}

export function OrganizationCreationForm({ onSkip, onSuccess }: OrganizationCreationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard');
      }
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
      
      onSkip();
    } catch (err) {
      console.error('Default organization creation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create default organization. Please try again.');
      setIsLoading(false);
    }
  };
  
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
          <Label htmlFor="name">Organization Name</Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Enter organization name"
            disabled={isLoading}
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <textarea
            id="description"
            {...register('description')}
            placeholder="Describe your organization"
            rows={3}
            disabled={isLoading}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          {errors.description && (
            <p className="text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="slug">Organization Slug</Label>
          <Input
            id="slug"
            {...register('slug')}
            placeholder="unique-identifier"
            disabled={isLoading}
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
              className="w-full flex items-center justify-center"
            >
              <SkipForward className="mr-2 h-4 w-4" />
              Skip and Use Default Settings
            </Button>
          )}
        </div>
        
        {onSkip && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-xs text-gray-600 text-center">
              If you skip, we&apos;ll create an organization with default settings. 
              You can update these details later in your organization settings.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}