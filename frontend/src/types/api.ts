/**
 * API-related type definitions
 */

// Generic API response wrapper
export interface ApiResponse<T = Record<string, unknown>> {
  data: T;
  message?: string;
  success: boolean;
}

// API error response
export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// Pagination metadata
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Paginated API response
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}