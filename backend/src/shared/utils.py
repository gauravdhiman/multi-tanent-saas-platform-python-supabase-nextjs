"""
Shared utility functions for the multi-tenant SaaS platform.
"""

from typing import Dict, Optional


def extract_first_last_name(user_metadata: Dict[str, any]) -> tuple[str, str]:
    """
    Extract first_name and last_name from user metadata with fallback to full_name or name.
    
    Args:
        user_metadata: Dictionary containing user metadata from auth provider
        
    Returns:
        tuple of (first_name, last_name)
    """
    first_name = user_metadata.get("first_name", "")
    last_name = user_metadata.get("last_name", "")
    
    # If first_name or last_name is missing, try to extract from full_name or name
    if not first_name or not last_name:
        full_name = user_metadata.get("full_name")
        if full_name:
            name_parts = full_name.strip().split()
            first_name = first_name or name_parts[0] if name_parts else ""
            last_name = last_name or " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
        else:
            name = user_metadata.get("name")
            if name:
                name_parts = name.strip().split()
                first_name = first_name or name_parts[0] if name_parts else ""
                last_name = last_name or " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
    
    return first_name, last_name
