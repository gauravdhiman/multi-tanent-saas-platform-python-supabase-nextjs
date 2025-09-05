# Environment Configuration

This document explains how to configure environment variables for different development scenarios.

## Environment Variable Files

The project uses different environment files depending on your development approach:

1. **Local Development (Non-containerized)**:
   - Backend: `backend/.env` (copy from `backend/.env.example`)
   - Frontend: `frontend/.env.local` (copy from `frontend/.env.local.example`)

2. **Containerized Development**:
   - Root: `.env` (copy from `.env.example`)

**Important**: The service-specific environment files (`backend/.env` and `frontend/.env.local`) are **only for non-containerized local development**. When running services in Docker containers, the root `.env` file is used instead.

## Supabase Configuration

### Required Keys

The Supabase configuration requires different environment variables for frontend and backend:

1. **SUPABASE_SERVICE_KEY**: Used only by the backend for administrative operations (service role key)
2. **SUPABASE_ANON_KEY**: Used by the backend for certain operations (anon key)
3. **NEXT_PUBLIC_SUPABASE_URL**: Used by the frontend (must be prefixed with NEXT_PUBLIC_ to be accessible in browser)
4. **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Used by the frontend (must be prefixed with NEXT_PUBLIC_ to be accessible in browser)

### Getting Your Supabase Database Password

To configure the DATABASE_URL environment variable for Alembic migrations, you'll need your Supabase database password:

1. Go to your Supabase project dashboard
2. Navigate to "Settings" → "Database"
3. Under "Connection Info", you'll see:
   - **Host**: Your project reference followed by `.supabase.co`
   - **Port**: 5432
   - **User**: postgres
   - **Password**: This is your database password (different from your Supabase project password)
4. Use this information to construct your DATABASE_URL:
   ```
   postgresql://postgres:[DATABASE-PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres
   ```

### OAuth Providers

To enable OAuth providers like Google, you need to:

1. Configure the OAuth provider in your Supabase project dashboard:
   - Go to Authentication → Providers
   - Enable the desired provider (e.g., Google)
   - Configure the provider settings with your OAuth credentials

2. Set the redirect URLs in your OAuth provider's dashboard:
   - Use the Supabase callback URL: `https://YOUR_SUPABASE_PROJECT_ID.supabase.co/auth/v1/callback`
   - You can find this URL in your Supabase dashboard under Authentication → Settings

**Note**: You do not need to create any custom callback endpoints in your frontend or backend. Supabase handles the entire OAuth flow for you.

For detailed instructions on setting up OAuth providers, see [OAUTH_SETUP.md](OAUTH_SETUP.md).

## Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=SaaS Platform
NEXT_PUBLIC_APP_DESCRIPTION=Multi-tenant SaaS application template
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Backend (.env)

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here
# Database Migration Settings (Alembic)
# IMPORTANT: Update 'your-database-password-here' with your actual Supabase database password
DATABASE_URL=postgresql://postgres:your-database-password-here@your-project-ref.supabase.co:5432/postgres
```

## Containerized Development (.env)

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
# Database Migration Settings (Alembic)
# IMPORTANT: Update 'your-database-password-here' with your actual Supabase database password
DATABASE_URL=postgresql://postgres:your-database-password-here@your-project-ref.supabase.co:5432/postgres
```

## Docker Configuration

The project includes optimized Docker configurations:

- **Production**: Multi-stage build with minimal image size
- **Development**: Volume mounting for hot reloading
- **Standalone**: Next.js standalone output for optimal Docker performance

Both [docker-compose.yml](file:///Users/gauravdhiman/projects/python/multi-tanent-saas-platform-python-supabase-nextjs/docker-compose.yml) and [docker-compose.dev.yml](file:///Users/gauravdhiman/projects/python/multi-tanent-saas-platform-python-supabase-nextjs/docker-compose.dev.yml) now use the `env_file` directive to load environment variables from the root `.env` file, ensuring consistency across development and production environments.

## Next Steps

1. Copy the appropriate example file to create your environment file
2. Update the values with your actual configuration
3. For OAuth providers, configure them in your Supabase dashboard
4. For database migrations, get your Supabase database password and update the DATABASE_URL
5. For detailed OAuth setup instructions, see [OAUTH_SETUP.md](OAUTH_SETUP.md)