'use client';

/**
 * Centralized providers component for managing all React context providers.
 * This ensures all providers are wrapped at the root layout level.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from '@/contexts/auth-context';
import { ThemeProvider } from '@/contexts/theme-context';
import { OrganizationProvider } from '@/contexts/organization-context';

interface ProvidersProps {
  children: React.ReactNode;
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

// This code is TanStack Query DevTool for debugging purposes
declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__:
      import("@tanstack/query-core").QueryClient;
  }
}

export function Providers({ children }: ProvidersProps) {
  React.useEffect(() => {
    // This code runs only in the browser after component mounts
    // Only enable TanStack Query debugging in development mode - useful for debugging
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      window.__TANSTACK_QUERY_CLIENT__ = queryClient;
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <OrganizationProvider>
            {children}
            {process.env.NODE_ENV === 'development' && (
              <ReactQueryDevtools initialIsOpen={false} />
            )}
          </OrganizationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
