// services/organization-service.ts
import { supabase } from '@/lib/supabase';
import { SpanStatusCode } from '@opentelemetry/api';
import { getTracer, getMeter, ensureOpentelemetryIsInitialized } from '@/lib/opentelemetry';

// Import types from centralized location
import type { Organization, OrganizationCreate, OrganizationUpdate } from '@/types/organization';

// Organization Service class
class OrganizationService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL; // Use the backend API URL from environment variables

  // Get the access token from Supabase
  private async getAccessToken(): Promise<string> {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      throw new Error('No active session');
    }
    return data.session.access_token;
  }

  // Generic fetch wrapper with authentication and tracing
  private async fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
    // Ensure OpenTelemetry is initialized
    ensureOpentelemetryIsInitialized();
    
    // Get tracer for this operation
    const tracer = getTracer('organization-service');
    
    // Check if tracer is available before using it
    if (!tracer) {
      // Fallback to regular fetch if tracer is not available
      const token = await this.getAccessToken();
      const defaultHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      const config: RequestInit = {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      };

      return fetch(`${this.baseUrl}${endpoint}`, config);
    }

    return await tracer.startActiveSpan(`http-request ${options.method || 'GET'} ${endpoint}`, async (span) => {
      try {
        const token = await this.getAccessToken();
        
        const defaultHeaders = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        };

        const config: RequestInit = {
          ...options,
          headers: {
            ...defaultHeaders,
            ...options.headers,
          },
        };

        // Add attributes to span
        span.setAttribute('http.url', `${this.baseUrl}${endpoint}`);
        span.setAttribute('http.method', options.method || 'GET');

        const response = await fetch(`${this.baseUrl}${endpoint}`, config);
        
        // Add response attributes
        span.setAttribute('http.status_code', response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.detail || `HTTP error! status: ${response.status}`;
          span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
          throw new Error(errorMessage);
        }
        
        span.setStatus({ code: SpanStatusCode.OK });
        return response;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  // Create organization for current user using the self endpoint
  async createSelfOrganization(orgData: OrganizationCreate): Promise<Organization> {
    // Ensure OpenTelemetry is initialized
    ensureOpentelemetryIsInitialized();
    
    // Get tracer and meter for this operation
    const tracer = getTracer('organization-service');
    const meter = getMeter('organization-service');
    
    // Create metrics only when needed
    const organizationOperationsCounter = meter?.createCounter('organization.operations', {
      description: 'Number of organization operations'
    });
    
    const organizationErrorsCounter = meter?.createCounter('organization.errors', {
      description: 'Number of organization operation errors'
    });
    
    organizationOperationsCounter?.add(1, { operation: 'createSelfOrganization', entity: 'organization' });
    
    // Check if tracer is available before using it
    if (!tracer) {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/organizations/self`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(orgData),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }
    
    return await tracer.startActiveSpan('organization.createSelfOrganization', async (span) => {
      try {
        span.setAttribute('organization.name', orgData.name);
        const response = await this.fetchWithAuth('/organizations/self', {
          method: 'POST',
          body: JSON.stringify(orgData),
        });
        const result = await response.json();
        span.setAttribute('organization.id', result.id);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        organizationErrorsCounter?.add(1, { operation: 'createSelfOrganization', error: 'exception' });
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  // Get organizations for current user with dummy organization detection
  async getUserOrganizations(): Promise<Organization[]> {
    // Ensure OpenTelemetry is initialized
    ensureOpentelemetryIsInitialized();
    
    // Get tracer and meter for this operation
    const tracer = getTracer('organization-service');
    const meter = getMeter('organization-service');
    
    // Create metrics only when needed
    const organizationOperationsCounter = meter?.createCounter('organization.operations', {
      description: 'Number of organization operations'
    });
    
    const organizationErrorsCounter = meter?.createCounter('organization.errors', {
      description: 'Number of organization operation errors'
    });
    
    organizationOperationsCounter?.add(1, { operation: 'getUserOrganizations', entity: 'organization' });
    
    // Check if tracer is available before using it
    if (!tracer) {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/organizations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }
    
    return await tracer.startActiveSpan('organization.getUserOrganizations', async (span) => {
      try {
        const response = await this.fetchWithAuth('/organizations');
        const result = await response.json();
        span.setAttribute('organizations.count', result.length);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        organizationErrorsCounter?.add(1, { operation: 'getUserOrganizations', error: 'exception' });
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  // Check if any organization is a dummy organization
  async hasDummyOrganization(): Promise<{ isDummy: boolean; organization?: Organization }> {
    try {
      const organizations = await this.getUserOrganizations();
      
      if (organizations.length === 0) {
        return { isDummy: false };
      }
      
      // Check the first organization (assuming user has one primary org)
      const org = organizations[0];
      
      // Detect dummy organizations by common patterns:
      // 1. Name contains "default" or "dummy"
      // 2. Slug contains "-org" pattern (auto-generated)
      // 3. Description mentions "default organization"
      const isDummyResult = 
        org.name.toLowerCase().includes('default') ||
        org.name.toLowerCase().includes('dummy') ||
        org.slug.includes('-org') ||
        (org.description && org.description.toLowerCase().includes('default organization'));
      
      const isDummy: boolean = Boolean(isDummyResult);
      
      return { isDummy, organization: isDummy ? org : undefined };
    } catch (error) {
      console.error('Error checking for dummy organization:', error);
      return { isDummy: false };
    }
  }

  // Create organization (platform admin only)
  async createOrganization(orgData: OrganizationCreate): Promise<Organization> {
    const response = await this.fetchWithAuth('/organizations/', {
      method: 'POST',
      body: JSON.stringify(orgData),
    });
    return response.json();
  }

  // Update organization
  async updateOrganization(orgId: string, orgData: OrganizationUpdate): Promise<Organization> {
    const response = await this.fetchWithAuth(`/organizations/${orgId}`, {
      method: 'PUT',
      body: JSON.stringify(orgData),
    });
    return response.json();
  }

  // Delete organization
  async deleteOrganization(orgId: string): Promise<void> {
    await this.fetchWithAuth(`/organizations/${orgId}`, {
      method: 'DELETE',
    });
  }
}

// Export a singleton instance of the Organization service
export const organizationService = new OrganizationService();