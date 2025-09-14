'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { RBACDashboard } from '@/components/dashboard/rbac-dashboard';
import { PermissionDemo } from '@/components/dashboard/permission-demo';
import { DummyOrgNotification } from '@/components/dashboard/dummy-org-notification';

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="p-6">
      {/* Dummy Organization Notification */}
      <DummyOrgNotification />
      
      {/* Navigation Tabs */}
      <div className="flex space-x-4 border-b mb-6">
        <button
          className={`py-2 px-4 font-medium ${activeTab === 'overview' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`py-2 px-4 font-medium ${activeTab === 'permissions' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('permissions')}
        >
          Permissions Demo
        </button>
        <button
          className={`py-2 px-4 font-medium ${activeTab === 'rbac' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('rbac')}
        >
          RBAC
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
          <p className="text-gray-600 mb-6">Welcome to your dashboard!</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Account Information</h2>
              <p className="text-gray-600">Manage your account settings</p>
            </div>
            
            <div className="bg-green-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Quick Stats</h2>
              <p className="text-gray-600">View your usage statistics</p>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Recent Activity</h2>
              <p className="text-gray-600">Check your recent actions</p>
            </div>
          </div>
        </div>
      ) : activeTab === 'permissions' ? (
        <PermissionDemo />
      ) : (
        <RBACDashboard />
      )}
    </div>
  );
}