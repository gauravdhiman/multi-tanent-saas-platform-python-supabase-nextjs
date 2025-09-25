'use client';

import React from 'react';
import { SignUpForm } from '@/components/auth/signup-form';
import { ProtectedRoute } from '@/components/auth/protected-route';
import Link from 'next/link';

export default function SignUpPage() {
  return (
    <ProtectedRoute reverse>
      <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gradient-to-r from-cyan-400 to-blue-500 w-12 h-12 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">AI</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
            <p className="text-gray-300">Join our platform to get started</p>
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 p-8 shadow-xl">
            <SignUpForm />
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-300">
              Already have an account?{' '}
              <Link href="/auth/signin" className="font-medium text-cyan-400 hover:text-cyan-300 cursor-pointer">
                Sign in here
              </Link>
            </p>
          </div>
          
          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-gray-300 hover:text-white flex items-center justify-center cursor-pointer">
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