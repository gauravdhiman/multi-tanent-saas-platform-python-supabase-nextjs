'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth, EmailNotVerifiedError } from '@/contexts/auth-context';
import Link from 'next/link';
import { ResendVerification } from '@/components/auth/resend-verification';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type SignInData = z.infer<typeof signInSchema>;

export function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string>('');
  const [unverifiedUserId, setUnverifiedUserId] = useState<string>('');
  const { signIn, signInWithOAuth } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInData>({
    resolver: zodResolver(signInSchema),
  });

  const handleSignIn = async (data: SignInData) => {
    setIsLoading('password');
    setError('');
    setShowVerificationPrompt(false);
    try {
      const result = await signIn(data);
      if (result?.error) {
        setError(result.error.message || 'Failed to sign in');
      }
      // Success case handled by global route guard
    } catch (error) {
      console.error('Sign in error:', error);
      if (error instanceof EmailNotVerifiedError && error.message === 'EMAIL_NOT_VERIFIED') {
        // Extract user info from the custom error
        const userInfo = (error as EmailNotVerifiedError).user;
        setShowVerificationPrompt(true);
        setUnverifiedEmail(userInfo?.email || data.email);
        setUnverifiedUserId(userInfo?.id || '');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading('google');
    setError('');
    try {
      const result = await signInWithOAuth('google');
      if (result?.error) {
        setError(result.error.message || 'Failed to sign in with Google');
        setIsLoading(null);
      }
      // Note: If successful, OAuth will redirect the user away from this page
    } catch (error) {
      console.error('Google sign in error:', error);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(null);
    }
  };

  const handleLinkedInSignIn = async () => {
    setIsLoading('linkedin_oidc');
    setError('');
    try {
      const result = await signInWithOAuth('linkedin_oidc');
      if (result?.error) {
        setError(result.error.message || 'Failed to sign in with LinkedIn');
        setIsLoading(null);
      }
      // Note: If successful, OAuth will redirect the user away from this page
    } catch (error) {
      console.error('LinkedIn sign in error:', error);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(null);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit(handleSignIn)} className="space-y-6">
        {error && (
          <Alert variant="destructive" className="bg-red-950/50 border-red-800/50">
            <AlertDescription className="text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-200">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-300" />
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="john@example.com"
              className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-gray-400"
              disabled={!!isLoading}
            />
          </div>
          {errors.email && (
            <p className="text-sm text-red-400">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-gray-200">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-300" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              placeholder="Enter your password"
              className="pl-10 pr-10 bg-white/10 border-white/30 text-white placeholder:text-gray-400"
              disabled={!!isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 h-4 w-4 text-gray-300 hover:text-gray-100 cursor-pointer"
              disabled={!!isLoading}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-400">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <input
              id="remember"
              type="checkbox"
              className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded bg-transparent"
              disabled={!!isLoading}
            />
            <Label htmlFor="remember" className="text-sm text-gray-300">
              Remember me
            </Label>
          </div>
          <button
            type="button"
            className="text-sm font-medium text-cyan-400 hover:text-cyan-300 cursor-pointer"
            disabled={!!isLoading}
          >
            Forgot password?
          </button>
        </div>

        <Button type="submit" className="w-full cursor-pointer" disabled={!!isLoading}>
          {isLoading === 'password' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>

      {showVerificationPrompt && (
        <div className="mt-6">
          <ResendVerification
            userEmail={unverifiedEmail}
            userId={unverifiedUserId}
            onResendSuccess={() => {
              // Could show a success message or redirect
            }}
            onResendError={(error) => {
              setError(error);
            }}
          />
        </div>
      )}

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>

      <div className="space-y-4">
        <button
          onClick={handleGoogleSignIn}
          disabled={!!isLoading}
          className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer bg-transparent"
        >
          {isLoading === 'google' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in with Google...
            </>
          ) : (
            <>
              <div className="flex items-center">
                <div className="bg-white border border-gray-300 rounded-md p-1 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path>
                  </svg>
                </div>
                <span>Sign in with Google</span>
              </div>
            </>
          )}
        </button>

        <button
          onClick={handleLinkedInSignIn}
          disabled={!!isLoading}
          className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer bg-transparent"
        >
          {isLoading === 'linkedin_oidc' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in with LinkedIn...
            </>
          ) : (
            <>
              <div className="flex items-center">
                <div className="bg-white border border-gray-300 rounded-md p-1 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#0077B5" d="M19.7 3H4.3A1.3 1.3 0 0 0 3 4.3v15.4A1.3 1.3 0 0 0 4.3 21h15.4a1.3 1.3 0 0 0 1.3-1.3V4.3A1.3 1.3 0 0 0 19.7 3zM8.3 18.3H5.7v-8.7h2.6v8.7zM7 8.7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm11.3 9.6h-2.6v-4.2c0-1 0-2.3-1.4-2.3s-1.6 1.1-1.6 2.2v4.3H10V9.6h2.5v1.2h.1c.4-.7 1.2-1.4 2.5-1.4 2.7 0 3.2 1.8 3.2 4.1v4.8z"/>
                  </svg>
                </div>
                <span>Sign in with LinkedIn</span>
              </div>
            </>
          )}
        </button>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-400">
          By signing in, you agree to the{' '}
          <Link href="/terms" className="text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}