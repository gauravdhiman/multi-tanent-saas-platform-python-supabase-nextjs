'use client';

import React, { useState } from 'react';
import { SignUpForm } from '@/components/auth/signup-form';
import { SignInForm } from '@/components/auth/signin-form';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {isSignUp ? (
          <SignUpForm onToggleMode={toggleMode} />
        ) : (
          <SignInForm onToggleMode={toggleMode} />
        )}
      </div>
    </div>
  );
}