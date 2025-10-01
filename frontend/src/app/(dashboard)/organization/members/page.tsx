'use client';

import { useOrganization } from '@/contexts/organization-context';
import { useSearchParams } from 'next/navigation';
import { useOrganizationMembers } from '@/hooks/use-organization-members';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { useOrganizationById } from '@/hooks/use-organization-by-id';
import { AccessDenied } from '@/components/ui/access-denied';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserPlus } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { organizationMembersColumns } from '@/components/organization-members/organization-members-data-table-columns';
import type { Organization } from '@/types/organization';

function MembersPageContent({ validatedOrg }: { validatedOrg: Organization | null }) {
  const { data: members = [], isLoading, error, refetch } = useOrganizationMembers();
  const userPermissions = useUserPermissions();

  if (isLoading) {
    return <LoadingState message="Loading members..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load members"
        message={error instanceof Error ? error.message : "Unable to load organization members. Please try again."}
        onRetry={() => refetch()}
        variant="default"
      />
    );
  }

 if (!userPermissions.canViewMembers) {
    return <AccessDenied 
      title="Access Denied"
      description="You do not have permission to view organization members. Only platform admins and organization admins can access this page."
      redirectPath="/dashboard"
    />;
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-10 p-3 rounded-lg">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{validatedOrg?.name || 'Organization'} Members</h1>
              <p className="text-muted-foreground">Manage organization members and their roles</p>
            </div>
          </div>

          {userPermissions.canManageMembers && (
            <Button className="flex items-center space-x-2">
              <UserPlus className="h-4 w-4" />
              <span>Invite Member</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-gray-500">Organization members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {members.filter(m => m.is_verified).length}
            </div>
            <p className="text-xs text-gray-50">Verified accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Administrators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-60">
              {members.filter(m => m.roles.some(r => r.name.includes('admin'))).length}
            </div>
            <p className="text-xs text-gray-500">Admin roles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {members.filter(m => !m.is_verified).length}
            </div>
            <p className="text-xs text-gray-500">Awaiting verification</p>
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Members</CardTitle>
          <CardDescription>
            A list of all members in your organization including their roles and status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={organizationMembersColumns} 
            data={members} 
            filterColumn="member"
            filterPlaceholder="Filter members..."
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function OrganizationMembersPage() {
  const { loading: orgLoading, error: orgError, currentOrganization, setCurrentOrganization } = useOrganization();
  const searchParams = useSearchParams();
  const orgId = searchParams.get('org_id');

  // Validate organization access when orgId is provided
  const { isValid: isOrgValid, loading: validationLoading, organization: validatedOrg } = useOrganizationById(orgId);

  // Set the current organization based on the validated orgId parameter if provided
  if (validatedOrg && (!currentOrganization || currentOrganization.id !== validatedOrg.id)) {
    setCurrentOrganization(validatedOrg);
  }

  // Make orgId mandatory - if not provided, redirect to organizations page
 if (!orgId) {
    return <AccessDenied 
      title="Organization ID Required"
      description="Organization ID is required to access this page. Please select an organization from the organizations page."
      redirectPath="/organizations"
    />;
  }

 // Handle organization loading states at the top level
  if (orgLoading || validationLoading) {
    return <LoadingState message="Loading organization..." />;
  }

  // Check if orgId is invalid (provided but validation failed)
  if (!isOrgValid) {
    return <AccessDenied 
      title="Access Denied"
      description="You do not have permission to access this organization. Please contact your organization administrator or platform admin for access."
      redirectPath="/organizations"
    />;
  }

  if (orgError || !validatedOrg) {
    return (
      <ErrorState
        title="Organization not found"
        message={orgError || 'Unable to load organization. Please check your access permissions.'}
        variant="default"
      />
    );
 }

  // Once organization is loaded, render the main content
 return <MembersPageContent validatedOrg={validatedOrg} />;
}
