/**
 * Common/shared type definitions
 */

import React from 'react';

// Base component props
export interface BaseProps {
  className?: string;
  children?: React.ReactNode;
}

// Dialog/Modal props
export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Form submission states
export interface FormState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

// Generic ID-based entity
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// Status types
export type Status = 'active' | 'inactive' | 'pending' | 'suspended';

// Theme types
export type Theme = 'light' | 'dark' | 'system';