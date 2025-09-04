"""
Configuration package for the FastAPI application.
"""

from .settings import settings, Settings
from .supabase import supabase_config

__all__ = ["settings", "Settings", "supabase_config"]