'use client';

import { BaseProps } from '@/types';

interface AppLayoutProps extends BaseProps {
  title?: string;
}

export function AppLayout({ children, title, className }: AppLayoutProps) {
  return (
    <div className={`min-h-screen bg-background ${className || ''}`}>
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">
              {title || process.env.NEXT_PUBLIC_APP_NAME}
            </h1>
            <nav className="flex items-center space-x-4">
              {/* Navigation items will be added here */}
            </nav>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      
      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          © 2024 {process.env.NEXT_PUBLIC_APP_NAME}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}