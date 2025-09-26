'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';

interface AccessDeniedProps {
  title?: string;
  description?: string;
  redirectPath?: string;
}

export function AccessDenied({ 
  title = 'Access Denied', 
  description = 'You do not have permission to access this page. Please contact your administrator for access.', 
  redirectPath = '/dashboard' 
}: AccessDeniedProps) {
  const router = useRouter();

  return (
    <div className="p-6">
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle className="text-destructive">{title}</CardTitle>
            <CardDescription>
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex justify-center">
              <Button onClick={() => router.push(redirectPath)} variant="outline">
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}