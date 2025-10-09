'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

export default function VerifyEmailPage() {
  const router = useRouter();
 const searchParams = useSearchParams();
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [redirectUrl, setRedirectUrl] = useState<string>('/dashboard');

  const token = searchParams.get('token');
  const userId = searchParams.get('user_id');

  useEffect(() => {
    if (token) {
      verifyEmail();
    } else {
      setStatus('error');
      setMessage('No verification token provided. Please check your email verification link.');
    }
 }, [token]);

  const verifyEmail = async () => {
    setStatus('verifying');
    
    try {
      // Call backend to verify email using the token
      const response = await fetch(`/api/notifications/verify-email?token=${token}${userId ? `&user_id=${userId}` : ''}`);
      
      if (response.ok) {
        const data = await response.json();
        setStatus('success');
        setMessage(data.message || 'Email verified successfully!');
        setRedirectUrl(data.redirect_url || '/dashboard');
        
        // Redirect after a short delay
        setTimeout(() => {
          router.push(data.redirect_url || '/dashboard');
        }, 3000);
      } else {
        const errorData = await response.json();
        setStatus('error');
        setMessage(errorData.detail || 'Failed to verify email. Please try again.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('error');
      setMessage('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-white/20 backdrop-blur-sm rounded-2xl border-white/30 shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {status === 'verifying' && (
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
                </div>
              )}
              {status === 'success' && (
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
              )}
              {status === 'error' && (
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-400" />
                </div>
              )}
              {status === 'idle' && (
                <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-indigo-400" />
                </div>
              )}
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              {status === 'verifying' ? 'Verifying Email...' : 
               status === 'success' ? 'Email Verified!' : 
               status === 'error' ? 'Verification Failed' : 'Verify Your Email'}
            </CardTitle>
            <CardDescription className="text-gray-300 mt-2">
              {status === 'verifying' ? 'Please wait while we verify your email address...' : 
               status === 'success' ? 'Your email has been successfully verified.' : 
               status === 'error' ? 'There was an issue verifying your email.' : 'Checking your verification link...'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status !== 'idle' && (
              <Alert className={status === 'error' ? 'bg-red-950/50 border-red-800/50' : 'bg-green-950/30 border-green-700/50'}>
                <AlertDescription className={status === 'error' ? 'text-red-300' : 'text-green-300'}>
                  {message}
                </AlertDescription>
              </Alert>
            )}

            {status === 'success' && (
              <div className="mt-6 text-center">
                <p className="text-gray-300 mb-4">
                  You will be redirected automatically, or click the button below.
                </p>
                <Button 
                  onClick={() => router.push(redirectUrl)}
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="mt-6 text-center">
                <p className="text-gray-300 mb-4">
                  Please try signing up again or contact support if the issue persists.
                </p>
                <Button 
                  onClick={() => router.push('/auth/signin')}
                  variant="outline"
                  className="w-full border-white/30 text-white hover:bg-white/10"
                >
                  Back to Sign In
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
