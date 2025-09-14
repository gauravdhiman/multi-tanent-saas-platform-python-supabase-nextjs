'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { organizationService } from '@/services/organization-service';
import { rbacService } from '@/services/rbac-service';
import { OrganizationEditDialog } from '@/components/organizations/organization-edit-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  Settings, 
  Calendar, 
  Globe, 
  Edit3,
  Shield,
  Activity
} from 'lucide-react';
import Link from 'next/link';
import type { Organization } from '@/types/organization';
import type { UserRoleWithPermissions } from '@/types/user';

export default function OrganizationPage() {
  const { user } = useAuth();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
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
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Get user's organizations
      const organizations = await organizationService.getUserOrganizations();
      if (!organizations || organizations.length === 0) {
        setError('No organization found');
        return;
      }

      const org = organizations[0]; // Get the primary organization
      setOrganization(org);

      // Load user's roles in this organization if they have access
      if (user) {
        try {
          const roles = await rbacService.getUserRolesWithPermissions(user.id, org.id);
          setUserRoles(roles);
        } catch (err) {
          console.error('Error loading user roles:', err);
          // Non-critical error, continue
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error loading organization:', err);
      setError(error.message || 'Failed to load organization');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadOrganizationData();
  }, [loadOrganizationData, user]);

  useEffect(() => {
    const checkUserPermissions = async () => {
      if (!user || !organization) return;

      try {
        // For now, provide reasonable defaults until backend allows self-permission checking
        // TODO: Update when backend allows users to check their own permissions
        console.log('Checking user permissions for organization access...');
        
        let isPlatformAdmin = false;
        let isOrgAdmin = false;
        let canUpdate = false;
        let canViewMembers = false;

        try {
          // Try to check if user is platform admin
          isPlatformAdmin = await rbacService.userHasRole(user.id, 'platform_admin');
        } catch (err) {
          console.warn('Cannot check platform admin role (insufficient permissions):', err);
          // For demo purposes, assume user has basic permissions
          isPlatformAdmin = false;
        }

        try {
          // Try to check if user is org admin for this organization
          isOrgAdmin = await rbacService.userHasRole(user.id, 'org_admin', organization.id);
        } catch (err) {
          console.warn('Cannot check org admin role (insufficient permissions):', err);
          // For demo purposes, assume user has basic permissions
          isOrgAdmin = false;
        }

        // If we can't check roles due to permissions, provide reasonable defaults
        // In a real app, these permissions would be determined by the auth token or user context
        if (!isPlatformAdmin && !isOrgAdmin) {
          // Grant basic permissions for organization members
          canUpdate = true; // Allow users to update their own organization
          canViewMembers = true; // Allow users to view organization members
        } else {
          // Admin users get full permissions
          canUpdate = true;
          canViewMembers = true;
        }

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
    };    checkUserPermissions();
  }, [user, organization]);

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

  if (error || !organization) {
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
              <h1 className="text-3xl font-bold text-foreground">{organization.name}</h1>
              <p className="text-muted-foreground">Organization Details</p>
            </div>
          </div>

          {userPermissions.canUpdate && (
            <Button onClick={handleEdit} className="flex items-center space-x-2">
              <Edit3 className="h-4 w-4" />
              <span>Edit Organization</span>
            </Button>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <Badge variant={organization.is_active ? "default" : "secondary"}>
            {organization.is_active ? 'Active' : 'Inactive'}
          </Badge>
          <span className="text-muted-foreground flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            Created {new Date(organization.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Quick Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {userPermissions.canViewMembers && (
              <Link href="/organization/members">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Members
                </Button>
              </Link>
            )}
            
            {userPermissions.canUpdate && (
              <Link href="/organization/settings">
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Organization Settings
                </Button>
              </Link>
            )}

            <Button variant="outline" className="w-full justify-start">
              <Globe className="h-4 w-4 mr-2" />
              View Public Profile
            </Button>
          </div>
        </CardContent>
      </Card>

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
                  <p className="text-foreground">{organization.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-foreground">{organization.description || 'No description'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Website</label>
                  {organization.website ? (
                    <a 
                      href={organization.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline"
                    >
                      {organization.website}
                    </a>
                  ) : (
                    <p className="text-muted-foreground">No website</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Slug</label>
                  <p className="text-foreground font-mono">{organization.slug}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="flex items-center space-x-2">
                    <Badge variant={organization.is_active ? "default" : "secondary"}>
                      {organization.is_active ? 'Active' : 'Inactive'}
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
      {organization && (
        <OrganizationEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          organization={organization}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}