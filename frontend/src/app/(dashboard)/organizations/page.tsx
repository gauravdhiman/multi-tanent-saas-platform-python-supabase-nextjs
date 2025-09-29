/**
 * Organizations management page - List and manage organizations
 */
'use client';

import React, { useState } from 'react';
import { Plus, Building2, Users, Settings, Trash2, Edit3, Eye, Calendar, CreditCard, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/contexts/organization-context';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { isDummyOrganization } from '@/lib/organization-utils';
import { OrganizationCreateDialog } from '@/components/organizations/organization-create-dialog';
import { OrganizationEditDialog } from '@/components/organizations/organization-edit-dialog';
import { OrganizationDeleteDialog } from '@/components/organizations/organization-delete-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import type { Organization } from '@/types/organization';

export default function OrganizationsPage() {
  const { organizations, loading: orgLoading, error: orgError } = useOrganization();
  const { isPlatformAdmin, canUpdateOrganization, canDeleteOrganization } = useUserPermissions();

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);

  const { refreshOrganizations } = useOrganization();

  const handleCreateSuccess = () => {
    refreshOrganizations();
    setCreateDialogOpen(false);
  };

  const handleEditSuccess = () => {
    refreshOrganizations();
    setEditDialogOpen(false);
    setSelectedOrganization(null);
  };

  const handleDeleteSuccess = () => {
    refreshOrganizations();
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

 if (orgLoading) {
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

  if (orgError) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p className="text-red-600 mb-4">{orgError}</p>
          <Button onClick={refreshOrganizations}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
            <p className="text-gray-600 mt-2">
              Manage your organizations and their settings
            </p>
          </div>
          {isPlatformAdmin && (
            <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Organization
            </Button>
          )}
        </div>

        {organizations.length === 0 ? (
          <div className="border rounded-lg shadow-sm">
            <div className="p-8 text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Organizations Found</h3>
              <p className="text-gray-600 mb-6">
                You don&apos;t have access to any organizations yet.
              </p>
              {isPlatformAdmin && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  Create Your First Organization
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="border rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-6 font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {organizations.map((org) => (
                    <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <div className="bg-blue-10 p-2 rounded-lg mr-3">
                            <Building2 className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 flex items-center gap-2">
                              {org.name}
                              {isDummyOrganization(org) && (
                                <Badge variant="secondary" className="text-xs">
                                  Setup Required
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 max-w-xs">
                        <div className="text-gray-600 truncate" title={org.description || 'No description provided'}>
                          {org.description || 'No description provided'}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant={org.is_active ? "default" : "secondary"}>
                          {org.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {org.slug}
                        </code>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(org.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem asChild>
                                <Link href={`/organization?org_id=${org.id}`} className="flex items-center">
                                  <Eye className="h-4 w-4 mr-2" />
                                  <span>View</span>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/organization/members?org_id=${org.id}`} className="flex items-center">
                                  <Users className="h-4 w-4 mr-2" />
                                  <span>Members</span>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/billing?org_id=${org.id}`} className="flex items-center">
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  <span>Billing</span>
                                </Link>
                              </DropdownMenuItem>
                              {canUpdateOrganization && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/organization/settings?org_id=${org.id}`} className="flex items-center">
                                    <Settings className="h-4 w-4 mr-2" />
                                    <span>Settings</span>
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              {canUpdateOrganization && (
                                <DropdownMenuItem 
                                  onClick={() => openEditDialog(org)}
                                  className="flex items-center"
                                >
                                  <Edit3 className="h-4 w-4 mr-2" />
                                  <span>Edit</span>
                                </DropdownMenuItem>
                              )}
                              {canDeleteOrganization && (
                                <DropdownMenuItem 
                                  onClick={() => openDeleteDialog(org)}
                                  className="flex items-center text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  <span>Delete</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
    </div>
  );
}
