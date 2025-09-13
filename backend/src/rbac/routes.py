"""
Main RBAC router that combines all RBAC functionality.
"""

from fastapi import APIRouter
from src.rbac.roles.routes import role_router
from src.rbac.permissions.routes import permission_router
from src.rbac.user_roles.routes import user_role_router

# Create main RBAC router
rbac_router = APIRouter(prefix="/rbac", tags=["Role-Based Access Control"])

# Include all sub-routers
rbac_router.include_router(role_router)
rbac_router.include_router(permission_router)
rbac_router.include_router(user_role_router)