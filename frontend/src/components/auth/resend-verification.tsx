import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Loader2 } from 'lucide-react';
import { notificationService } from '@/services/notification-service';

interface ResendVerificationProps {
  userEmail: string;
  userId?: string;
  onResendSuccess?: () => void;
  onResendError?: (error: string) => void;
}

export function ResendVerification({ 
  userEmail, 
  userId, 
  onResendSuccess, 
 onResendError 
}: ResendVerificationProps) {
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0); // Cooldown timer

  // Handle cooldown period to prevent spam
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const handleResend = async () => {
    if (timeLeft > 0) return; // Still in cooldown

    setIsResending(true);
    setError(null);
    setMessage(null);

    try {
      // Call the notification service to send verification email
      if (!userId) {
        throw new Error('User ID is required to send verification email');
      }
      const data = await notificationService.sendVerificationEmail(userId);

      if (data.success) {
        setMessage('Verification email sent successfully!');
        setTimeLeft(60); // 60 second cooldown
        onResendSuccess?.();
      } else {
        setError(data.message || 'Failed to send verification email. Please try again.');
        onResendError?.(data.message || 'Failed to send verification email');
      }
    } catch (err) {
      console.error('Error resending verification:', err);
      setError('An unexpected error occurred. Please try again.');
      onResendError?.('An unexpected error occurred. Please try again.');
    } finally {
      setIsResending(false);
    }
 };

  return (
    <div className="space-y-4">
      <Alert className="bg-blue-950/30 border-blue-800/50">
        <div className="flex items-start">
          <Mail className="h-4 w-4 mt-0.5 mr-3 text-blue-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <AlertDescription className="text-blue-300">
              Please check your email (<span className="font-medium text-white">{userEmail}</span>) for a verification link. 
              If you don&apos;t see it, check your spam folder.
            </AlertDescription>
          </div>
        </div>
      </Alert>

      <Button
        onClick={handleResend}
        disabled={isResending || timeLeft > 0}
        variant="outline"
        className="w-full border-blue-500 text-blue-400 hover:bg-blue-500/10 disabled:opacity-50"
      >
        {isResending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : timeLeft > 0 ? (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Resend in {timeLeft}s
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Resend Verification Email
          </>
        )}
      </Button>

      {message && (
        <Alert className="bg-green-950/30 border-green-700/50">
          <AlertDescription className="text-green-300">
            {message}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="bg-red-950/50 border-red-800/50">
          <AlertDescription className="text-red-300">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
