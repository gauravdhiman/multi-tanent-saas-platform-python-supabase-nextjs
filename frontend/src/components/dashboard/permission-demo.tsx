// components/dashboard/permission-demo.tsx
'use client';

import React from 'react';
import { useRBAC } from '@/hooks/use-rbac';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, UserPlus, CreditCard, Settings } from 'lucide-react';

export function PermissionDemo() {
  const [, actions] = useRBAC();

  // Check various permissions
  const canCreateUsers = actions.hasPermission('user:create');
  const canReadBilling = actions.hasPermission('billing:read');
  const canManageSettings = actions.hasPermission('platform:settings');
  const isAdmin = actions.hasRole('platform_admin');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Permission-Based UI Demo
          </CardTitle>
          <CardDescription>
            This component demonstrates how UI elements can be shown or hidden based on user permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Your Permissions</h3>
            <div className="flex flex-wrap gap-2">
              {canCreateUsers && (
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-secondary text-secondary-foreground">
                  Create Users
                </div>
              )}
              {canReadBilling && (
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-secondary text-secondary-foreground">
                  Read Billing
                </div>
              )}
              {canManageSettings && (
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-secondary text-secondary-foreground">
                  Manage Settings
                </div>
              )}
              {isAdmin && (
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary text-primary-foreground">
                  Platform Admin
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User Management Card - Only visible if user has user:create permission */}
            {canCreateUsers && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    User Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    You have permission to create and manage users.
                  </p>
                  <Button>Create New User</Button>
                </CardContent>
              </Card>
            )}

            {/* Billing Card - Only visible if user has billing:read permission */}
            {canReadBilling && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Billing Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    You have access to view billing information.
                  </p>
                  <Button variant="outline">View Billing Details</Button>
                </CardContent>
              </Card>
            )}

            {/* Settings Card - Only visible if user has platform:settings permission */}
            {canManageSettings && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Platform Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    You can manage platform-wide settings.
                  </p>
                  <Button variant="outline">Configure Settings</Button>
                </CardContent>
              </Card>
            )}

            {/* Admin Card - Only visible if user has platform_admin role */}
            {isAdmin && (
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Administrative Panel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Full administrative access to the platform.
                  </p>
                  <div className="flex gap-2">
                    <Button>Manage Roles</Button>
                    <Button variant="outline">Audit Logs</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {!canCreateUsers && !canReadBilling && !canManageSettings && !isAdmin && (
            <Alert>
              <AlertTitle>No Special Permissions</AlertTitle>
              <AlertDescription>
                You don{`'`}t have any special permissions beyond basic access. 
                Contact your administrator if you need additional permissions.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}