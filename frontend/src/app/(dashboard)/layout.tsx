'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { OrganizationCheck } from '@/components/auth/organization-check';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <OrganizationCheck>
        <DashboardLayout>
          {children}
        </DashboardLayout>
      </OrganizationCheck>
    </ProtectedRoute>
  );
}