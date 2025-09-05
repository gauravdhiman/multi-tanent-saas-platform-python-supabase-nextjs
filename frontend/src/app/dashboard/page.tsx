'use client';

import React, { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { RBACDashboard } from '@/components/dashboard/rbac-dashboard';
import { PermissionDemo } from '@/components/dashboard/permission-demo';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      router.push('/auth/signin');
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Welcome, {user?.firstName}</span>
              <Button 
                onClick={handleSignOut}
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-50 cursor-pointer"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="container mx-auto px-4 py-4">
          <div className="flex space-x-4 border-b">
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
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
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
      </div>
    </ProtectedRoute>
  );
}