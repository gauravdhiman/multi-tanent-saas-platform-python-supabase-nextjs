"""
Example routes demonstrating how to use the RBAC system for authorization.
"""

from uuid import UUID
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import JSONResponse

from .middleware import get_current_user_id
from .permissions import require_permission, require_role, has_permission, has_role

# Create example router
example_router = APIRouter(prefix="/example", tags=["Example RBAC Usage"])


@example_router.get("/admin-only")
async def admin_only_endpoint(current_user_id: UUID = Depends(get_current_user_id)):
    """Example endpoint that requires platform_admin role."""
    await require_role(current_user_id, "platform_admin")
    
    return JSONResponse({
        "message": "You have accessed an admin-only endpoint!",
        "user_id": str(current_user_id)
    })


@example_router.get("/billing-access")
async def billing_access_endpoint(current_user_id: UUID = Depends(get_current_user_id)):
    """Example endpoint that requires billing:read permission."""
    await require_permission(current_user_id, "billing:read")
    
    return JSONResponse({
        "message": "You have accessed the billing information!",
        "user_id": str(current_user_id)
    })


@example_router.get("/conditional-content")
async def conditional_content_endpoint(current_user_id: UUID = Depends(get_current_user_id)):
    """Example endpoint that shows different content based on user permissions."""
    response_data = {
        "message": "Welcome to the conditional content endpoint!",
        "user_id": str(current_user_id),
        "features": []
    }
    
    # Check what permissions the user has and customize the response
    if await has_permission(current_user_id, "user:create"):
        response_data["features"].append("user_management")
    
    if await has_permission(current_user_id, "billing:read"):
        response_data["features"].append("billing_access")
    
    if await has_role(current_user_id, "platform_admin"):
        response_data["features"].append("admin_panel")
    
    return JSONResponse(response_data)


@example_router.post("/create-user")
async def create_user_endpoint(current_user_id: UUID = Depends(get_current_user_id)):
    """Example endpoint that requires user:create permission."""
    await require_permission(current_user_id, "user:create")
    
    # In a real implementation, this would create a user
    return JSONResponse({
        "message": "User created successfully!",
        "user_id": str(current_user_id)
    })