# Environment Configuration

This document explains how environment variables are managed across different environments in this multi-tenant SaaS platform.

## Environment Variable Management Strategy

### 1. Local Development (Non-containerized)
- **Backend**: Uses `backend/.env` file
- **Frontend**: Uses `frontend/.env.local` file
- These files are NOT committed to version control
- Developers copy from example files and customize with their own values
- **Purpose**: Used only when running services directly on the host machine (without Docker)

### 2. Containerized Development
- Uses root-level `.env` file
- This file is referenced by both [docker-compose.yml](file:///Users/gauravdhiman/projects/python/multi-tanent-saas-platform-python-supabase-nextjs/docker-compose.yml) and [docker-compose.dev.yml](file:///Users/gauravdhiman/projects/python/multi-tanent-saas-platform-python-supabase-nextjs/docker-compose.dev.yml) via `env_file` directive
- NOT committed to version control
- Developers copy from `.env.example` and customize
- **Purpose**: Used when running services in Docker containers

### 3. Production
- Environment variables are injected via secure methods (Docker secrets, Kubernetes secrets, etc.)
- Never committed to version control

## Important Note

The service-specific environment files (`backend/.env` and `frontend/.env.local`) are **only for non-containerized local development**. When running services in Docker containers, the root `.env` file is used instead. This separation ensures that:

1. Containerized environments have a single source of configuration
2. Non-containerized development can use service-specific configurations
3. Production environments can use secure secret injection methods

## Supabase Configuration Keys

The Supabase configuration requires different environment variables for frontend and backend:

1. **SUPABASE_SERVICE_KEY**: Used only by the backend for administrative operations (service role key)
2. **SUPABASE_ANON_KEY**: Used by the backend for certain operations (anon key)
3. **NEXT_PUBLIC_SUPABASE_URL**: Used by the frontend (must be prefixed with NEXT_PUBLIC_ to be accessible in browser)
4. **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Used by the frontend (must be prefixed with NEXT_PUBLIC_ to be accessible in browser)

**Important**: Both the root `.env` file and the service-specific files should contain the appropriate Supabase keys for their respective environments.

## File Structure

```
project-root/
├── .env                    # For containerized development (NOT committed)
├── .env.example           # Example for containerized development (committed)
├── backend/
│   ├── .env              # For local backend development (NOT committed)
│   └── .env.example      # Example for local backend development (committed)
└── frontend/
    ├── .env.local        # For local frontend development (NOT committed)
    └── .env.local.example # Example for local frontend development (committed)
```

## Setup Instructions

### For Local Development (Non-containerized)

1. **Backend Setup**:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your values
   ```

2. **Frontend Setup**:
   ```bash
   cd frontend
   cp .env.local.example .env.local
   # Edit .env.local with your values
   ```

### For Containerized Development

1. **Root Setup**:
   ```bash
   cp .env.example .env
   # Edit .env with your values (these will be used by Docker containers)
   ```

2. **Run with Docker**:
   ```bash
   # For development with hot reloading
   docker compose -f docker-compose.dev.yml up --build
   
   # For production
   docker compose up --build
   ```

## Environment Variable Precedence

The configuration follows this precedence order:
1. Environment variables set directly in docker-compose.yml (highest precedence)
2. Environment variables from files specified in `env_file` directive
3. Default values defined in application code (lowest precedence)

## Security Notes

- Never commit actual secrets to version control
- Use example files to document required variables
- In production, use secure secret management systems
- Regularly rotate secrets and keys

## Required Variables

See `.env.example`, `backend/.env.example`, and `frontend/.env.local.example` for complete lists of required environment variables.