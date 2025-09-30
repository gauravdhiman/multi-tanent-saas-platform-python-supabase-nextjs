/**
 * Organizations management page - List and manage organizations
 */
'use client';

import React, { useState } from 'react';
import { Plus, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/contexts/organization-context';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { OrganizationCreateDialog } from '@/components/organizations/organization-create-dialog';
import { OrganizationEditDialog } from '@/components/organizations/organization-edit-dialog';
import { OrganizationDeleteDialog } from '@/components/organizations/organization-delete-dialog';
import { DataTable } from '@/components/data-table/data-table';
import { organizationsColumns } from '@/components/organizations/organizations-data-table-columns';
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
            <p className="text-gray-60">Loading organizations...</p>
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
          <DataTable 
            columns={organizationsColumns} 
            data={organizations} 
            filterColumn="name"
            filterPlaceholder="Filter organizations..."
          />
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
