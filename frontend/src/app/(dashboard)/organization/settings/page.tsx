'use client';

import React, { useState } from 'react';
import { useOrganization } from '@/contexts/organization-context';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { AccessDenied } from '@/components/ui/access-denied';
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

export default function OrganizationSettingsPage() {
  const { currentOrganization, loading: orgLoading, error: orgError } = useOrganization();
  const {canDeleteOrganization, canViewSettings} = useUserPermissions();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate save operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    // Organization context will automatically update
  };

  if (orgLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading settings...</div>
        </div>
      </div>
    );
  }

  if (orgError || !currentOrganization) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">{orgError || 'Organization not found'}</div>
        </div>
      </div>
    );
  }

  if (!canViewSettings) {
    return <AccessDenied
      title="Access Denied"
      description="You do not have permission to view organization settings. Only platform admins and organization admins can access this page."
      redirectPath="/dashboard"
    />;
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <div className="bg-primary/10 p-3 rounded-lg">
            <SettingsIcon className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Organization Settings</h1>
            <p className="text-muted-foreground">Manage your organization&apos;s configuration and preferences</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          {canDeleteOrganization && <TabsTrigger value="danger">Danger Zone</TabsTrigger>}
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
                    defaultValue={currentOrganization.name}
                    placeholder="Enter organization name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgSlug">Slug</Label>
                  <Input
                    id="orgSlug"
                    defaultValue={currentOrganization.slug}
                    placeholder="organization-slug"
                  />
                  <p className="text-xs text-muted-foreground">Used in URLs and API calls</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="orgWebsite">Website</Label>
                <Input 
                  id="orgWebsite" 
                  type="url"
                  defaultValue={currentOrganization.website || ''}
                  placeholder="https://www.example.com"
                />
                <p className="text-xs text-muted-foreground">Your organization&apos;s official website URL</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="orgDescription">Description</Label>
                <Textarea 
                  id="orgDescription" 
                  defaultValue={currentOrganization.description || ''}
                  placeholder={`Tell us about your organization! Consider including:

• When your organization was founded
• Number of employees (e.g., "50-100 employees")
• Location and places of operation
• Operating hours and time zones
• Products and services you offer
• Your business domain and industry
• Geographic areas you serve
• Key links (website, LinkedIn, social media)

Example: "Founded in 2020, we're a 25-person software company based in San Francisco, operating globally across multiple time zones. We specialize in SaaS solutions for e-commerce businesses, serving clients in North America and Europe. Our flagship products include inventory management and analytics tools. Visit us at company.com or connect on LinkedIn."`}
                  className="min-h-[120px]"
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  A detailed description helps team members and stakeholders understand your organization better. Include founding date, size, location, services, and important links.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="isActive" 
                    defaultChecked={currentOrganization.is_active}
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

        {canDeleteOrganization && (
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
      {currentOrganization && (
        <OrganizationEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          organization={currentOrganization}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Delete Dialog */}
      {currentOrganization && (
        <OrganizationDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          organization={currentOrganization}
          onSuccess={() => {
            setDeleteDialogOpen(false);
            // Redirect or handle successful deletion
          }}
        />
      )}
    </div>
  );
}
