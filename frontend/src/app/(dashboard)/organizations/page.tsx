/**
 * Organizations management page - List and manage organizations
 */
'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Building2, Users, Settings, Trash2, Edit3, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';
import { organizationService } from '@/services/organization-service';
import { rbacService } from '@/services/rbac-service';
import { isDummyOrganization } from '@/lib/organization-utils';
import { OrganizationCreateDialog } from '@/components/organizations/organization-create-dialog';
import { OrganizationEditDialog } from '@/components/organizations/organization-edit-dialog';
import { OrganizationDeleteDialog } from '@/components/organizations/organization-delete-dialog';
import Link from 'next/link';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function OrganizationsPage() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState({
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    isPlatformAdmin: false
  });

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);

  useEffect(() => {
    const checkUserPermissions = async () => {
      if (!user) return;

      try {
        // Check if user is platform admin
        const isPlatformAdmin = await rbacService.userHasRole(user.id, 'platform_admin');
        
        // Check specific permissions
        const canCreate = isPlatformAdmin || await rbacService.userHasPermission(user.id, 'organization:create');
        const canUpdate = isPlatformAdmin || await rbacService.userHasPermission(user.id, 'organization:update');
        const canDelete = isPlatformAdmin || await rbacService.userHasPermission(user.id, 'organization:delete');

        setUserPermissions({
          canCreate,
          canUpdate,
          canDelete,
          isPlatformAdmin
        });
      } catch (error) {
        console.error('Error checking permissions:', error);
      }
    };
    
    loadOrganizations();
    checkUserPermissions();
  }, [user]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);
      const orgs = await organizationService.getUserOrganizations();
      setOrganizations(orgs);
    } catch (err) {
      console.error('Error loading organizations:', err);
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = (newOrg: Organization) => {
    setOrganizations(prev => [...prev, newOrg]);
    setCreateDialogOpen(false);
  };

  const handleEditSuccess = (updatedOrg: Organization) => {
    setOrganizations(prev => 
      prev.map(item => item.id === updatedOrg.id ? updatedOrg : item)
    );
    setEditDialogOpen(false);
    setSelectedOrganization(null);
  };

  const handleDeleteSuccess = (deletedOrgId: string) => {
    setOrganizations(prev => prev.filter(item => item.id !== deletedOrgId));
    setDeleteDialogOpen(false);
    setSelectedOrganization(null);
  };

  const openEditDialog = (org: Organization) => {
    setSelectedOrganization(org);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (org: Organization) => {
    setSelectedOrganization(org);
    setDeleteDialogOpen(true);
  };

  const canEditOrganization = () => {
    if (userPermissions.isPlatformAdmin) return true;
    // Org admins can edit their own organization
    return userPermissions.canUpdate;
  };

  const canDeleteOrganization = () => {
    // Only platform admins can delete organizations
    return userPermissions.isPlatformAdmin && userPermissions.canDelete;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading organizations...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadOrganizations}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-gray-600 mt-2">
            Manage your organizations and their settings
          </p>
        </div>
        {userPermissions.canCreate && (
          <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Organization
          </Button>
        )}
      </div>

      {organizations.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Organizations Found</h3>
              <p className="text-gray-600 mb-6">
                You don&apos;t have access to any organizations yet.
              </p>
              {userPermissions.canCreate && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  Create Your First Organization
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org) => (
            <Card key={org.id} className="relative group hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg flex items-center gap-2 truncate">
                      <Building2 className="h-5 w-5" />
                      {org.name}
                      {isDummyOrganization(org) && (
                        <Badge variant="secondary" className="text-xs">
                          Setup Required
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {org.description || 'No description provided'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(org)}
                      disabled={!canEditOrganization()}
                      className="h-8 w-8 p-0"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    {canDeleteOrganization() && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(org)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Status</span>
                    <Badge variant={org.is_active ? "default" : "secondary"}>
                      {org.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Slug</span>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {org.slug}
                    </code>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Created</span>
                    <span>{new Date(org.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="flex-1"
                  >
                    <Link href="/organization">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="flex-1"
                  >
                    <Link href="/organization/members">
                      <Users className="h-4 w-4 mr-1" />
                      Members
                    </Link>
                  </Button>
                  {canEditOrganization() && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex-1"
                    >
                      <Link href="/organization/settings">
                        <Settings className="h-4 w-4 mr-1" />
                        Settings
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <OrganizationCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />

      {selectedOrganization && (
        <>
          <OrganizationEditDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            organization={selectedOrganization}
            onSuccess={handleEditSuccess}
          />

          <OrganizationDeleteDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            organization={selectedOrganization}
            onSuccess={handleDeleteSuccess}
          />
        </>
      )}
    </div>
  );
}