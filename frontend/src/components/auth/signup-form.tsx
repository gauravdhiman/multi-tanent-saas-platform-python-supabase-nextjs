import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, Mail, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/auth-context';

const signUpSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/\d/, 'Must contain a number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Must contain special character'),
  passwordConfirm: z.string().optional(), // Make it optional
}).refine((data) => {
  // Only validate password match if both password and passwordConfirm have values
  if (!data.password || !data.passwordConfirm) return true;
  return data.password === data.passwordConfirm;
}, {
  message: "Passwords don't match",
  path: ['passwordConfirm'],
});

type SignUpFormData = z.infer<typeof signUpSchema>;

export function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { signUp, signInWithOAuth } = useAuth();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger,
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    mode: 'onChange', // Validate on change
  });
  
  const password = watch('password');
  const passwordConfirm = watch('passwordConfirm');
  
  // Trigger validation when passwordConfirm changes, but only if it has a value
  React.useEffect(() => {
    if (passwordConfirm && passwordConfirm.length > 0) {
      trigger('passwordConfirm');
    }
  }, [passwordConfirm, trigger]);
  
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password?.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    return strength;
  };
  
  const passwordStrength = password ? getPasswordStrength(password) : 0;
  const strengthColors = ['bg-red-500', 'bg-red-400', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  
  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading('password');
    setError(null);
    setSuccess(null);
    
    try {
      const { error } = await signUp({
        email: data.email,
        password: data.password,
        passwordConfirm: data.passwordConfirm || '',
        firstName: data.firstName,
        lastName: data.lastName,
      });
      
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Account created! Please check your email for verification.');
        // Note: Organization creation will be handled after email verification and sign in
      }
    } catch (error) {
      console.error('Sign up error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };
  
  
  const handleGoogleSignUp = async () => {
    setIsLoading('google');
    setError(null);
    try {
      const result = await signInWithOAuth('google');
      if (result?.error) {
        setError(result.error.message || 'Failed to sign up with Google');
        setIsLoading(null);
      }
      // Note: If successful, OAuth will redirect the user away from this page
      // The organization creation will happen in the OAuth callback handler
    } catch (error) {
      console.error('Google sign up error:', error);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(null);
    }
  };

  const handleLinkedInSignUp = async () => {
    setIsLoading('linkedin_oidc');
    setError(null);
    try {
      const result = await signInWithOAuth('linkedin_oidc');
      if (result?.error) {
        setError(result.error.message || 'Failed to sign up with LinkedIn');
        setIsLoading(null);
      }
      // Note: If successful, OAuth will redirect the user away from this page
      // The organization creation will happen in the OAuth callback handler
    } catch (error) {
      console.error('LinkedIn sign up error:', error);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(null);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <Alert variant="destructive" className="bg-red-950/50 border-red-800/50">
            <AlertDescription className="text-red-300">{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="border-green-700/50 bg-green-950/30">
            <AlertDescription className="text-green-300">{success}</AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-gray-200">First Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-300" />
              <Input
                id="firstName"
                {...register('firstName')}
                placeholder="John"
                className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-gray-400"
                disabled={!!isLoading}
              />
            </div>
            {errors.firstName && (
              <p className="text-sm text-red-400">{errors.firstName.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-gray-200">Last Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-300" />
              <Input
                id="lastName"
                {...register('lastName')}
                placeholder="Doe"
                className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-gray-400"
                disabled={!!isLoading}
              />
            </div>
            {errors.lastName && (
              <p className="text-sm text-red-400">{errors.lastName.message}</p>
            )}
          </div>
        </div>
        
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
              placeholder="Create a strong password"
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
          
          {password && (
            <div className="space-y-2">
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded ${
                      passwordStrength >= level ? strengthColors[passwordStrength - 1] : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-400">
                Password strength: {strengthLabels[passwordStrength - 1] || 'Very Weak'}
              </p>
            </div>
          )}
          
          {errors.password && (
            <p className="text-sm text-red-400">{errors.password.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="passwordConfirm" className="text-gray-200">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-300" />
            <Input
              id="passwordConfirm"
              type={showConfirmPassword ? 'text' : 'password'}
              {...register('passwordConfirm')}
              placeholder="Confirm your password"
              className="pl-10 pr-10 bg-white/10 border-white/30 text-white placeholder:text-gray-400"
              disabled={!!isLoading}
              onBlur={() => passwordConfirm && trigger('passwordConfirm')}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-3 h-4 w-4 text-gray-300 hover:text-gray-100 cursor-pointer"
              disabled={!!isLoading}
            >
              {showConfirmPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>
          {errors.passwordConfirm && (
            <p className="text-sm text-red-400">{errors.passwordConfirm.message}</p>
          )}
        </div>
        
        <Button 
          id="create-account-button"
          type="submit" 
          className="w-full cursor-pointer" 
          disabled={!!isLoading}
        >
          {isLoading === 'password' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Account...
            </>
          ) : (
            'Create Account'
          )}
        </Button>
      </form>
      
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
          onClick={handleGoogleSignUp}
          disabled={!!isLoading}
          className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer bg-transparent"
        >
          {isLoading === 'google' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing up with Google...
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
                <span>Sign up with Google</span>
              </div>
            </>
          )}
        </button>

        <button
          onClick={handleLinkedInSignUp}
          disabled={!!isLoading}
          className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer bg-transparent"
        >
          {isLoading === 'linkedin_oidc' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing up with LinkedIn...
            </>
          ) : (
            <>
              <div className="flex items-center">
                <div className="bg-white border border-gray-300 rounded-md p-1 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#0077B5" d="M19.7 3H4.3A1.3 1.3 0 0 0 3 4.3v15.4A1.3 1.3 0 0 0 4.3 21h15.4a1.3 1.3 0 0 0 1.3-1.3V4.3A1.3 1.3 0 0 0 19.7 3zM8.3 18.3H5.7v-8.7h2.6v8.7zM7 8.7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm11.3 9.6h-2.6v-4.2c0-1 0-2.3-1.4-2.3s-1.6 1.1-1.6 2.2v4.3H10V9.6h2.5v1.2h.1c.4-.7 1.2-1.4 2.5-1.4 2.7 0 3.2 1.8 3.2 4.1v4.8z"/>
                  </svg>
                </div>
                <span>Sign up with LinkedIn</span>
              </div>
            </>
          )}
        </button>
      </div>
    </div>
  );
}