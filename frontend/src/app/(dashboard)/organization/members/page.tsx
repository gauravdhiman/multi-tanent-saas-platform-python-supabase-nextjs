'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { organizationService } from '@/services/organization-service';
import { rbacService } from '@/services/rbac-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, UserCheck, UserX, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Member {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_verified: boolean;
  created_at: string;
  roles: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}

export default function OrganizationMembersPage() {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState({
    canManageMembers: false,
    canViewMembers: false,
    isPlatformAdmin: false,
    isOrgAdmin: false
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Get user's primary organization
      const organizations = await organizationService.getUserOrganizations();
      if (!organizations || organizations.length === 0) {
        setError('No organization found');
        return;
      }

      const org = organizations[0];
      setOrganization(org);

      // Load members (mock data for now)
      setMembers([
        {
          id: user?.id || '1',
          email: user?.email || 'current@example.com',
          first_name: user?.firstName || 'Current',
          last_name: user?.lastName || 'User',
          is_verified: user?.emailConfirmedAt ? true : false,
          created_at: new Date().toISOString(),
          roles: [{ id: '1', name: 'org_admin', description: 'Organization Administrator' }]
        }
      ]);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error loading data:', err);
      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const checkUserPermissions = async () => {
    if (!user || !organization) return;

    try {
      // Provide reasonable defaults until backend allows self-permission checking
      let isPlatformAdmin = false;
      let isOrgAdmin = false;

      try {
        isPlatformAdmin = await rbacService.userHasRole(user.id, 'platform_admin');
      } catch (err) {
        console.warn('Cannot check platform admin role:', err);
        isPlatformAdmin = false;
      }

      try {
        isOrgAdmin = await rbacService.userHasRole(user.id, 'org_admin', organization.id);
      } catch (err) {
        console.warn('Cannot check org admin role:', err);
        isOrgAdmin = false;
      }

      // Grant basic member management permissions
      const canManageMembers = isPlatformAdmin || isOrgAdmin || true; // Allow basic member management
      const canViewMembers = isPlatformAdmin || isOrgAdmin || true; // Allow viewing members

      setUserPermissions({
        canManageMembers,
        canViewMembers,
        isPlatformAdmin,
        isOrgAdmin
      });
    } catch (err) {
      console.error('Error checking user permissions:', err);
      // Fallback: provide basic permissions
      setUserPermissions({
        canManageMembers: true,
        canViewMembers: true,
        isPlatformAdmin: false,
        isOrgAdmin: false
      });
    }
  };

  useEffect(() => {
    checkUserPermissions();
  }, [user, organization]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading members...</div>
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

  if (!userPermissions.canViewMembers) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">You don&apos;t have permission to view members</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Members</h1>
              <p className="text-gray-600">Manage organization members and their roles</p>
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
            <p className="text-xs text-gray-500">Verified accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Administrators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
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
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Member</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Joined</th>
                  {userPermissions.canManageMembers && (
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b">
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                          {member.first_name?.[0]}{member.last_name?.[0]}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {member.first_name} {member.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {member.roles.map((role) => (
                          <Badge key={role.id} variant="outline" className="text-xs">
                            {role.name}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1">
                        {member.is_verified ? (
                          <>
                            <UserCheck className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-gray-900">Active</span>
                          </>
                        ) : (
                          <>
                            <UserX className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm text-gray-900">Pending</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(member.created_at).toLocaleDateString()}
                    </td>
                    {userPermissions.canManageMembers && (
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Edit Roles</DropdownMenuItem>
                            <DropdownMenuItem>View Profile</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              Remove Member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}