// components/dashboard/rbac-dashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRBAC } from '@/hooks/use-rbac';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, Plus, Edit, Trash2, Users, Shield } from 'lucide-react';

export function RBACDashboard() {
  const [state, actions] = useRBAC();
  const { roles, permissions, userRoles, loading, error } = state;
  
  const [activeTab, setActiveTab] = useState('roles');
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [isCreatingPermission, setIsCreatingPermission] = useState(false);
  
  // Form states
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [newPermission, setNewPermission] = useState({ name: '', description: '', resource: '', action: '' });
  
  // Check if user has admin privileges
  const isPlatformAdmin = actions.hasRole('platform_admin');
  const isOrgAdmin = actions.hasRole('org_admin');
  
  // Only platform admins can manage roles and permissions
  if (!isPlatformAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You don{`'`}t have permission to access the RBAC dashboard.</p>
            <p>Only platform administrators can manage roles and permissions.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await actions.createRole(newRole);
      setNewRole({ name: '', description: '' });
      setIsCreatingRole(false);
    } catch (error) {
      console.error('Failed to create role:', error);
    }
  };
  
  const handleCreatePermission = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await actions.createPermission(newPermission);
      setNewPermission({ name: '', description: '', resource: '', action: '' });
      setIsCreatingPermission(false);
    } catch (error) {
      console.error('Failed to create permission:', error);
    }
  };
  
  const handleDeleteRole = async (roleId: string) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      try {
        await actions.deleteRole(roleId);
      } catch (error) {
        console.error('Failed to delete role:', error);
      }
    }
  };
  
  const handleDeletePermission = async (permissionId: string) => {
    if (window.confirm('Are you sure you want to delete this permission?')) {
      try {
        await actions.deletePermission(permissionId);
      } catch (error) {
        console.error('Failed to delete permission:', error);
      }
    }
  };
  
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Role-Based Access Control</h1>
          <p className="text-muted-foreground">
            Manage roles, permissions, and user access
          </p>
        </div>
        <div className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm">
          <Shield className="w-3 h-3 inline mr-1" />
          Platform Admin
        </div>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg">
          Error: {error}
        </div>
      )}
      
      <div className="space-y-6">
        <div className="flex space-x-4 border-b">
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'roles' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('roles')}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Roles
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'permissions' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('permissions')}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            Permissions
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'assignments' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('assignments')}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Assignments
          </button>
        </div>
        
        {/* Roles Tab */}
        {activeTab === 'roles' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Roles</CardTitle>
                  <CardDescription>
                    Manage system roles and their permissions
                  </CardDescription>
                </div>
                <Button onClick={() => setIsCreatingRole(true)} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Role
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isCreatingRole && (
                <div className="mb-6 p-4 border rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Create New Role</h3>
                  <form onSubmit={handleCreateRole} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="role-name">Role Name</Label>
                        <Input
                          id="role-name"
                          value={newRole.name}
                          onChange={(e) => setNewRole({...newRole, name: e.target.value})}
                          placeholder="e.g., editor, viewer"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role-description">Description</Label>
                        <Input
                          id="role-description"
                          value={newRole.description}
                          onChange={(e) => setNewRole({...newRole, description: e.target.value})}
                          placeholder="Role description"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsCreatingRole(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Create Role
                      </Button>
                    </div>
                  </form>
                </div>
              )}
              
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{role.name}</h3>
                        <p className="text-sm text-muted-foreground">{role.description || '-'}</p>
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            role.is_system_role 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-secondary text-secondary-foreground'
                          }`}>
                            {role.is_system_role ? 'System' : 'Custom'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" disabled>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          disabled={role.is_system_role}
                          onClick={() => handleDeleteRole(role.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Permissions Tab */}
        {activeTab === 'permissions' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Permissions</CardTitle>
                  <CardDescription>
                    Manage system permissions
                  </CardDescription>
                </div>
                <Button onClick={() => setIsCreatingPermission(true)} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Permission
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isCreatingPermission && (
                <div className="mb-6 p-4 border rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Create New Permission</h3>
                  <form onSubmit={handleCreatePermission} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="permission-name">Permission Name</Label>
                        <Input
                          id="permission-name"
                          value={newPermission.name}
                          onChange={(e) => setNewPermission({...newPermission, name: e.target.value})}
                          placeholder="e.g., user:create, post:delete"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="permission-description">Description</Label>
                        <Input
                          id="permission-description"
                          value={newPermission.description}
                          onChange={(e) => setNewPermission({...newPermission, description: e.target.value})}
                          placeholder="Permission description"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="permission-resource">Resource</Label>
                        <Input
                          id="permission-resource"
                          value={newPermission.resource}
                          onChange={(e) => setNewPermission({...newPermission, resource: e.target.value})}
                          placeholder="e.g., user, post, organization"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="permission-action">Action</Label>
                        <Input
                          id="permission-action"
                          value={newPermission.action}
                          onChange={(e) => setNewPermission({...newPermission, action: e.target.value})}
                          placeholder="e.g., create, read, update, delete"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsCreatingPermission(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Create Permission
                      </Button>
                    </div>
                  </form>
                </div>
              )}
              
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {permissions.map((permission) => (
                    <div key={permission.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{permission.name}</h3>
                        <p className="text-sm text-muted-foreground">{permission.description || '-'}</p>
                        <div className="mt-2 flex gap-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                            {permission.resource}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                            {permission.action}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" disabled>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeletePermission(permission.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Assignments Tab */}
        {activeTab === 'assignments' && (
          <Card>
            <CardHeader>
              <CardTitle>User Role Assignments</CardTitle>
              <CardDescription>
                Manage which users have which roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Your Roles</h3>
                  <div className="flex flex-wrap gap-2">
                    {userRoles.map((role) => (
                      <div key={role.id} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-secondary text-secondary-foreground">
                        {role.name}
                      </div>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Assign Role to User</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="user-id">User ID</Label>
                      <Input id="user-id" placeholder="Enter user ID" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role-select">Role</Label>
                      <select 
                        id="role-select" 
                        className="w-full p-2 border rounded-md"
                        disabled={loading}
                      >
                        <option value="">Select a role</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button disabled={loading}>
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Assign Role
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}