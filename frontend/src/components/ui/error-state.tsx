import React from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  variant?: 'default' | 'minimal';
  className?: string;
}

export function ErrorState({ 
  title = 'Something went wrong',
  message = 'An error occurred while loading the data.',
  onRetry,
  retryLabel = 'Try again',
  variant = 'default',
  className 
}: ErrorStateProps) {
  if (variant === 'minimal') {
    return (
      <div className={cn(
        'flex items-center justify-center h-64',
        className
      )}>
        <div className="flex flex-col items-center space-y-2 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <div className="text-destructive text-sm">{message}</div>
          {onRetry && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry}
              className="mt-2"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              {retryLabel}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('p-6', className)}>
      <Card className="border-destructive/20">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-destructive">{title}</h3>
              <p className="text-sm text-muted-foreground max-w-md">{message}</p>
            </div>
            {onRetry && (
              <Button onClick={onRetry} variant="outline">
                <RefreshCcw className="h-4 w-4 mr-2" />
                {retryLabel}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}