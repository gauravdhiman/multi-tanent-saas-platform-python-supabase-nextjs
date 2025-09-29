'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useOrganization } from '@/contexts/organization-context';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { useOrganizationById } from '@/hooks/use-organization-by-id';
import { AccessDenied } from '@/components/ui/access-denied';
import { OrganizationEditDialog } from '@/components/organizations/organization-edit-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Users,
  Settings,
  Calendar,
  Edit3,
  Shield,
  Activity,
  CreditCard,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { UserRoleWithPermissions } from '@/types/user';

export default function OrganizationPage() {
  const { user } = useAuth();
  const { currentOrganization, loading: orgLoading, setCurrentOrganization } = useOrganization();
  const { canUpdateOrganization, canViewMembers, isPlatformAdmin, isOrgAdmin } = useUserPermissions();
  const searchParams = useSearchParams();
  const orgId = searchParams.get('org_id');

  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const loadOrganizationData = useCallback(async () => {
    // This function is now primarily for re-fetching data after an update.
    // The initial data loading is handled by the hooks.
  }, []);

  // Validate organization access when orgId is provided
  const { isValid: isOrgValid, loading: validationLoading, organization: validatedOrg } = useOrganizationById(orgId);

  // Set the current organization based on the validated orgId parameter if provided
  if (validatedOrg && (!currentOrganization || currentOrganization.id !== validatedOrg.id)) {
    setCurrentOrganization(validatedOrg);
 }

  const handleEdit = () => {
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    loadOrganizationData();
  };

  // Make orgId mandatory - if not provided, redirect to organizations page
 if (!orgId) {
    return <AccessDenied 
      title="Organization ID Required"
      description="Organization ID is required to access this page. Please select an organization from the organizations page."
      redirectPath="/organizations"
    />;
  }

 if (orgLoading || validationLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-50">Loading organization...</div>
        </div>
      </div>
    );
  }

  // Check if orgId is invalid (provided but validation failed)
  if (!isOrgValid) {
    return <AccessDenied 
      title="Access Denied"
      description="You do not have permission to access this organization. Please contact your organization administrator or platform admin for access."
      redirectPath="/organizations"
    />;
  }

  if (!isPlatformAdmin && !isOrgAdmin) {
    return <AccessDenied 
      title="Access Denied"
      description="You do not have permission to view organization pages. Please contact your organization administrator or platform admin for access."
      redirectPath="/dashboard"
    />;
  }

  if (!validatedOrg) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-50">Organization not found</div>
        </div>
      </div>
    );
  }

  const userRoles = user?.roles
    ?.filter(userRole => !userRole.organization_id || userRole.organization_id === validatedOrg.id)
    .map(userRole => userRole.role) || [];

  return (
    <div className="p-6">
      {/* Organization Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="bg-primary/10 p-3 rounded-lg">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{validatedOrg.name}</h1>
              <p className="text-muted-foreground">Organization Details</p>
            </div>
          </div>

          {canUpdateOrganization && (
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="flex items-center space-x-2">
                    <Activity className="h-4 w-4" />
                    <span>Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem className="flex items-center space-x-2" onClick={handleEdit}>
                    <Edit3 className="h-4 w-4" />
                    <span>Edit Organization</span>
                  </DropdownMenuItem>
                  {canViewMembers && (
                    <Link href={`/organization/members?org_id=${validatedOrg.id}`}>
                      <DropdownMenuItem className="flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>Manage Members</span>
                      </DropdownMenuItem>
                    </Link>
                  )}
                  {canUpdateOrganization && (
                    <Link href={`/organization/settings?org_id=${validatedOrg.id}`}>
                      <DropdownMenuItem className="flex items-center space-x-2">
                        <Settings className="h-4 w-4" />
                        <span>Organization Settings</span>
                      </DropdownMenuItem>
                    </Link>
                  )}
                  <Link href={`/organization/billing?org_id=${validatedOrg.id}`}>
                    <DropdownMenuItem className="flex items-center space-x-2">
                      <CreditCard className="h-4 w-4" />
                      <span>Billing & Subscriptions</span>
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <Badge variant={validatedOrg.is_active ? "default" : "secondary"}>
            {validatedOrg.is_active ? 'Active' : 'Inactive'}
          </Badge>
          <span className="text-muted-foreground flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            Created {new Date(validatedOrg.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Organization Details */}
      <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Organization Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>Organization Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-foreground">{validatedOrg.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-foreground">{validatedOrg.description || 'No description'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Website</label>
                  {validatedOrg.website ? (
                    <a
                      href={validatedOrg.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline"
                    >
                      {validatedOrg.website}
                    </a>
                  ) : (
                    <p className="text-muted-foreground">No website</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Slug</label>
                  <p className="text-foreground font-mono">{validatedOrg.slug}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="flex items-center space-x-2">
                    <Badge variant={validatedOrg.is_active ? "default" : "secondary"}>
                      {validatedOrg.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Roles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Your Roles</span>
                </CardTitle>
                <CardDescription>
                  Your roles and permissions in this organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userRoles.length > 0 ? (
                  <div className="space-y-3">
                    {(userRoles as UserRoleWithPermissions[]).map((role) => (
                      <div key={role.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-foreground">{role.name}</h4>
                          <Badge variant="outline">Role</Badge>
                        </div>
                        {role.description && (
                          <p className="text-sm text-muted-foreground mb-2">{role.description}</p>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No roles assigned</p>
                )}
              </CardContent>
            </Card>
          </div>
      </div>

      {/* Edit Dialog */}
      {validatedOrg && (
        <OrganizationEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          organization={validatedOrg}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
