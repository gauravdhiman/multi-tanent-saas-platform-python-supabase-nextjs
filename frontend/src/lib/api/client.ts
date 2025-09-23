import { ApiResponse } from '@/types';
import { supabase } from '@/lib/supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
  private baseURL: string;
  private headers: Record<string, string>;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.headers = {
      'Content-Type': 'application/json',
    };
  }

  setAuthToken(token: string) {
    this.headers['Authorization'] = `Bearer ${token}`;
  }

  clearAuthToken() {
    delete this.headers['Authorization'];
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        return {
          'Authorization': `Bearer ${session.access_token}`,
        };
      }
    } catch (error) {
      console.warn('Failed to get auth session:', error);
    }
    return {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    // Get authentication headers
    const authHeaders = await this.getAuthHeaders();

    const config: RequestInit = {
      ...options,
      headers: {
        ...this.headers,
        ...authHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      // Handle different response types
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        // Handle 401 - attempt token refresh and retry once
        if (response.status === 401 && retryCount === 0) {
          try {
            const { data: { session }, error } = await supabase.auth.refreshSession();

            if (!error && session?.access_token) {
              // Retry with new token
              return this.request<T>(endpoint, options, retryCount + 1);
            } else {
              console.warn('Token refresh failed:', error);
              // Fall through to error handling
            }
          } catch (refreshError) {
            console.warn('Token refresh error:', refreshError);
            // Fall through to error handling
          }
        }

        // Handle specific error cases
        if (response.status === 401) {
          throw new Error('Authentication required. Please sign in.');
        }
        if (response.status === 403) {
          throw new Error('Access denied. You do not have permission to perform this action.');
        }
        // Handle error message extraction more robustly
        let errorMessage = 'API request failed';

        if (data?.message) {
          errorMessage = typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
        } else if (data?.detail) {
          errorMessage = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
        } else if (data?.error) {
          errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
        }

        throw new Error(errorMessage);
      }

      // Handle both wrapped and direct responses
      return data?.data !== undefined ? data : { data, success: true };
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();