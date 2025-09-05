"""
Authentication middleware for extracting user information from JWT tokens.
"""

from typing import Optional, Tuple
from uuid import UUID
import jwt
from fastapi import HTTPException, status, Header
from config import supabase_config


async def get_current_user_id(authorization: str = Header(None)) -> UUID:
    """
    Extract the current user ID from the authorization header.
    
    Args:
        authorization: The Authorization header value (Bearer token)
        
    Returns:
        UUID: The current user's ID
        
    Raises:
        HTTPException: If the token is invalid or missing
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = authorization.replace("Bearer ", "")
    
    try:
        # Decode the JWT token using Supabase's public key
        # In a real implementation, you would verify the token properly
        # For now, we'll extract the user ID directly from the token
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: user ID not found"
            )
        
        return UUID(user_id)
        
    except jwt.DecodeError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication error: {str(e)}"
        )


def verify_supabase_token(token: str) -> Tuple[Optional[dict], Optional[str]]:
    """
    Verify a Supabase JWT token and return the payload.
    
    Args:
        token: The JWT token to verify
        
    Returns:
        Tuple[Optional[dict], Optional[str]]: (payload, error_message)
    """
    try:
        if not supabase_config.is_configured():
            return None, "Supabase not configured"
        
        # In a real implementation, you would verify the token using Supabase's public key
        # This is a simplified version for demonstration
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload, None
        
    except jwt.DecodeError:
        return None, "Invalid token"
    except Exception as e:
        return None, str(e)