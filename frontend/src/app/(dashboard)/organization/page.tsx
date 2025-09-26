'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useOrganization } from '@/contexts/organization-context';
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
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import type { UserRoleWithPermissions } from '@/types/user';

export default function OrganizationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentOrganization, loading: orgLoading, error: orgError } = useOrganization();

  const [userRoles, setUserRoles] = useState<UserRoleWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState({
    canUpdate: false,
    canViewMembers: false,
    isPlatformAdmin: false,
    isOrgAdmin: false
  });

  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const loadOrganizationData = useCallback (async () => {
    if (!user || !currentOrganization) return;

    try {
      setLoading(true);
      setError(null);

      // Set user's roles from the auth context (already loaded)
      if (user?.roles) {
        // Filter roles for this organization
        const orgRoles = user.roles
          .filter(userRole => !userRole.organization_id || userRole.organization_id === currentOrganization.id)
          .map(userRole => userRole.role);
        setUserRoles(orgRoles);
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error loading organization:', err);
      setError(error.message || 'Failed to load organization');
    } finally {
      setLoading(false);
    }
  }, [user, currentOrganization]);

  useEffect(() => {
    if (!orgLoading && currentOrganization) {
      loadOrganizationData();
    } else if (!orgLoading && !currentOrganization) {
      setLoading(false);
      setError(orgError || 'No organization found');
    }
  }, [loadOrganizationData, currentOrganization, orgLoading, orgError]);

  useEffect(() => {
    const checkUserPermissions = () => {
      if (!user || !currentOrganization) return;

      try {
        // Check permissions using the user profile from auth context
        const isPlatformAdmin = user.hasRole('platform_admin');
        const isOrgAdmin = user.hasRole('org_admin', currentOrganization.id);

        // Grant permissions based on roles
        const canUpdate = isPlatformAdmin || isOrgAdmin;
        const canViewMembers = isPlatformAdmin || isOrgAdmin;

        setUserPermissions({
          canUpdate,
          canViewMembers,
          isPlatformAdmin,
          isOrgAdmin
        });
      } catch (err) {
        console.error('Error checking user permissions:', err);
        // Fallback: provide basic permissions
        setUserPermissions({
          canUpdate: true,
          canViewMembers: true,
          isPlatformAdmin: false,
          isOrgAdmin: false
        });
      }
    };

    checkUserPermissions();
  }, [user, currentOrganization]);

  const handleEdit = () => {
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    loadOrganizationData();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading organization...</div>
        </div>
      </div>
    );
  }


  if (!userPermissions.isPlatformAdmin && !userPermissions.isOrgAdmin) {
    return <AccessDenied 
      title="Access Denied"
      description="You do not have permission to view organization pages. Please contact your organization administrator or platform admin for access."
      redirectPath="/dashboard"
    />;
  }

  if (error || !currentOrganization) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">{error || 'Organization not found'}</div>
        </div>
      </div>
    );
  }

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
              <h1 className="text-3xl font-bold text-foreground">{currentOrganization.name}</h1>
              <p className="text-muted-foreground">Organization Details</p>
            </div>
          </div>

          {userPermissions.canUpdate && (
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
                  {userPermissions.canViewMembers && (
                    <Link href="/organization/members">
                      <DropdownMenuItem className="flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>Manage Members</span>
                      </DropdownMenuItem>
                    </Link>
                  )}
                  {userPermissions.canUpdate && (
                    <Link href="/organization/settings">
                      <DropdownMenuItem className="flex items-center space-x-2">
                        <Settings className="h-4 w-4" />
                        <span>Organization Settings</span>
                      </DropdownMenuItem>
                    </Link>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <Badge variant={currentOrganization.is_active ? "default" : "secondary"}>
            {currentOrganization.is_active ? 'Active' : 'Inactive'}
          </Badge>
          <span className="text-muted-foreground flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            Created {new Date(currentOrganization.created_at).toLocaleDateString()}
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
                  <p className="text-foreground">{currentOrganization.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-foreground">{currentOrganization.description || 'No description'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Website</label>
                  {currentOrganization.website ? (
                    <a
                      href={currentOrganization.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline"
                    >
                      {currentOrganization.website}
                    </a>
                  ) : (
                    <p className="text-muted-foreground">No website</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Slug</label>
                  <p className="text-foreground font-mono">{currentOrganization.slug}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="flex items-center space-x-2">
                    <Badge variant={currentOrganization.is_active ? "default" : "secondary"}>
                      {currentOrganization.is_active ? 'Active' : 'Inactive'}
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
                    {userRoles.map((role) => (
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
      {currentOrganization && (
        <OrganizationEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          organization={currentOrganization}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}