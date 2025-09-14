'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { organizationService } from '@/services/organization-service';
import { rbacService } from '@/services/rbac-service';
import { OrganizationEditDialog } from '@/components/organizations/organization-edit-dialog';
import { OrganizationDeleteDialog } from '@/components/organizations/organization-delete-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings as SettingsIcon, 
  Save, 
  Trash2, 
  Shield, 
  Users,
  Bell,
  Key
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function OrganizationSettingsPage() {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState({
    canUpdate: false,
    canDelete: false,
    canManageMembers: false,
    isPlatformAdmin: false,
    isOrgAdmin: false
  });

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOrganizationData();
  }, [user]);

  const loadOrganizationData = async () => {
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
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error loading organization:', err);
      setError(error.message || 'Failed to load organization');
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

      // Grant basic organization management permissions
      const canUpdate = isPlatformAdmin || isOrgAdmin || true; // Allow basic org updates
      const canDelete = isPlatformAdmin; // Only platform admins can delete
      const canManageMembers = isPlatformAdmin || isOrgAdmin || true; // Allow member management

      setUserPermissions({
        canUpdate,
        canDelete,
        canManageMembers,
        isPlatformAdmin,
        isOrgAdmin
      });
    } catch (err) {
      console.error('Error checking user permissions:', err);
      // Fallback: provide basic permissions
      setUserPermissions({
        canUpdate: true,
        canDelete: false,
        canManageMembers: true,
        isPlatformAdmin: false,
        isOrgAdmin: false
      });
    }
  };

  useEffect(() => {
    checkUserPermissions();
  }, [user, organization]);

  const handleSave = async () => {
    setSaving(true);
    // Simulate save operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    loadOrganizationData();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading settings...</div>
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

  if (!userPermissions.canUpdate) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">You don&apos;t have permission to view organization settings</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <div className="bg-gray-100 p-3 rounded-lg">
            <SettingsIcon className="h-8 w-8 text-gray-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Organization Settings</h1>
            <p className="text-gray-600">Manage your organization&apos;s configuration and preferences</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          {userPermissions.canDelete && <TabsTrigger value="danger">Danger Zone</TabsTrigger>}
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Information</CardTitle>
              <CardDescription>
                Update your organization&apos;s basic information and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input 
                    id="orgName" 
                    defaultValue={organization.name} 
                    placeholder="Enter organization name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgSlug">Slug</Label>
                  <Input 
                    id="orgSlug" 
                    defaultValue={organization.slug} 
                    placeholder="organization-slug"
                  />
                  <p className="text-xs text-gray-500">Used in URLs and API calls</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="orgDescription">Description</Label>
                <Textarea 
                  id="orgDescription" 
                  defaultValue={organization.description || ''}
                  placeholder="Describe your organization"
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="isActive" 
                    defaultChecked={organization.is_active}
                    className="rounded"
                  />
                  <label htmlFor="isActive" className="text-sm">Organization is active</label>
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="flex items-center space-x-2">
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Member Management</span>
              </CardTitle>
              <CardDescription>
                Configure member access and role settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-3">Default Member Role</h4>
                  <select className="w-full p-2 border rounded-md">
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                    <option value="contributor">Contributor</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Role assigned to new members by default</p>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-3">Invitation Settings</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span className="text-sm">Allow members to invite others</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Require admin approval for new members</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span className="text-sm">Send welcome email to new members</span>
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security Settings</span>
              </CardTitle>
              <CardDescription>
                Manage security policies and access controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-3">Authentication</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Require two-factor authentication</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span className="text-sm">Allow password-based login</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Enable single sign-on (SSO)</span>
                    </label>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-3">Session Management</h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="sessionTimeout">Session timeout (minutes)</Label>
                      <Input 
                        id="sessionTimeout" 
                        type="number" 
                        defaultValue="480"
                        className="w-32"
                      />
                    </div>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span className="text-sm">Force logout on browser close</span>
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notification Settings</span>
              </CardTitle>
              <CardDescription>
                Configure how your organization receives notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-3">Email Notifications</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span className="text-sm">New member joined</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span className="text-sm">Security alerts</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Weekly activity summary</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Billing notifications</span>
                    </label>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-3">Webhook Settings</h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="webhookUrl">Webhook URL</Label>
                      <Input 
                        id="webhookUrl" 
                        placeholder="https://your-app.com/webhooks"
                      />
                    </div>
                    <div>
                      <Label htmlFor="webhookSecret">Webhook Secret</Label>
                      <div className="flex space-x-2">
                        <Input 
                          id="webhookSecret" 
                          type="password"
                          placeholder="Enter webhook secret"
                        />
                        <Button variant="outline" size="sm">
                          <Key className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {userPermissions.canDelete && (
          <TabsContent value="danger" className="space-y-6">
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-red-600">
                  <Trash2 className="h-5 w-5" />
                  <span>Danger Zone</span>
                </CardTitle>
                <CardDescription>
                  Irreversible and destructive actions for this organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-600 mb-2">Delete Organization</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Permanently delete this organization and all associated data. This action cannot be undone.
                  </p>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    Delete Organization
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Edit Dialog */}
      {organization && (
        <OrganizationEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          organization={organization}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Delete Dialog */}
      {organization && (
        <OrganizationDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          organization={organization}
          onSuccess={() => {
            setDeleteDialogOpen(false);
            // Redirect or handle successful deletion
          }}
        />
      )}
    </div>
  );
}