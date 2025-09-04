"""
Supabase configuration and client setup.
Handles authentication, database, and other Supabase services.
"""

from typing import Optional
from supabase import Client, create_client
from config.settings import settings


class SupabaseConfig:
    """Supabase client configuration and management."""
    
    def __init__(self):
        self._client: Optional[Client] = None
    
    @property
    def client(self) -> Optional[Client]:
        """Get or create Supabase client instance if configured."""
        if self._client is None:
            if settings.supabase_url and settings.supabase_service_key:
                self._client = create_client(
                    supabase_url=settings.supabase_url,
                    supabase_key=settings.supabase_service_key
                )
            else:
                # Return None if not configured (development mode)
                return None
        
        return self._client
    
    def is_configured(self) -> bool:
        """Check if Supabase is properly configured."""
        return bool(settings.supabase_url and settings.supabase_service_key)
    
    def health_check(self) -> bool:
        """Check if Supabase connection is healthy."""
        try:
            if not self.is_configured() or not self.client:
                return False
                
            # Simple health check by trying to access the auth service
            # This will test if the client can actually connect to Supabase
            _ = self.client.auth.get_session()
            return True
        except Exception as e:
            print(f"Supabase health check failed: {e}")
            return False


# Global Supabase instance
supabase_config = SupabaseConfig()