'use client';

import React, { useEffect } from 'react';
import { OrganizationCreationForm } from '@/components/auth/organization-creation-form';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useOrganization } from '@/contexts/organization-context';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function OrganizationCreationPage() {
  const router = useRouter();
  const { currentOrganization, loading } = useOrganization();
  
  useEffect(() => {
    if (!loading && currentOrganization) {
      router.push('/dashboard');
    }
  }, [currentOrganization, loading, router]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (currentOrganization) {
    return null; // Will redirect
  }
  
  const handleSkip = () => {
    // Navigate to dashboard when skipping
    router.push('/dashboard');
  };
  
  const handleSuccess = () => {
    // Navigate to dashboard after successful organization creation
    router.push('/dashboard');
  };
  
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <OrganizationCreationForm onSkip={handleSkip} onSuccess={handleSuccess} />
          </div>
          
          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-800 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}