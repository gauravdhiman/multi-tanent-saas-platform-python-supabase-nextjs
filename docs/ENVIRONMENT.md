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

## OpenTelemetry Configuration

The project uses OpenTelemetry for observability with New Relic as the backend. For detailed information about the OpenTelemetry implementation, see [OPENTELEMETRY_CONSOLIDATED.md](OPENTELEMETRY_CONSOLIDATED.md).

### New Relic License Key

All environments require a New Relic license key:
```
NEW_RELIC_LICENSE_KEY=your-new-relic-license-key-here
```

### Backend OpenTelemetry Configuration

The backend uses gRPC to communicate with the OpenTelemetry Collector:

```bash
# OpenTelemetry Configuration
OTEL_ENABLED=true
OTEL_SERVICE_NAME=saas-platform-backend
# Traces
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://otel-collector:4317
OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=grpc
OTEL_EXPORTER_OTLP_TRACES_INSECURE=true
# Metrics
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://otel-collector:4317
OTEL_EXPORTER_OTLP_METRICS_PROTOCOL=grpc
OTEL_EXPORTER_OTLP_METRICS_INSECURE=true
# Logs
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://otel-collector:4317
OTEL_EXPORTER_OTLP_LOGS_PROTOCOL=grpc
OTEL_EXPORTER_OTLP_LOGS_INSECURE=true

# OpenTelemetry Configuration - FastAPI Instrumentation
# Exclude health check endpoints from tracing to reduce noise
OTEL_PYTHON_FASTAPI_EXCLUDED_URLS=/health,/health/ready,/health/live
```

### Frontend OpenTelemetry Configuration

The frontend uses HTTP/protobuf to communicate with the OpenTelemetry Collector:

```bash
# OpenTelemetry Configuration (Optional for local development)
NEXT_PUBLIC_OTEL_ENABLED=true
NEXT_PUBLIC_OTEL_SERVICE_NAME=saas-platform-frontend-dev

# Frontend OpenTelemetry Configuration - Traces
# Use HTTP/protobuf for frontend since it runs in browser
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://127.0.0.1:4318/v1/traces
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=http/protobuf

# Frontend OpenTelemetry Configuration - Metrics
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://127.0.0.1:4318/v1/metrics

# Frontend OpenTelemetry Configuration - Logs
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://127.0.0.1:4318/v1/logs
```

### Containerized Environment OpenTelemetry Configuration

In containerized environments, both frontend and backend send telemetry to the OpenTelemetry Collector:

```bash
# New Relic Configuration for OpenTelemetry
NEW_RELIC_LICENSE_KEY=your-new-relic-license-key-here
NEW_RELIC_APP_NAME=SaaS Platform

# OpenTelemetry Configuration - Traces
OTEL_ENABLED=true
OTEL_SERVICE_NAME=saas-platform
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://otel-collector:4317
OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=grpc
OTEL_EXPORTER_OTLP_TRACES_INSECURE=true

# OpenTelemetry Configuration - Metrics
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://otel-collector:4317
OTEL_EXPORTER_OTLP_METRICS_PROTOCOL=grpc
OTEL_EXPORTER_OTLP_METRICS_INSECURE=true

# OpenTelemetry Configuration - Logs
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://otel-collector:4317
OTEL_EXPORTER_OTLP_LOGS_PROTOCOL=grpc
OTEL_EXPORTER_OTLP_LOGS_INSECURE=true

# Frontend OpenTelemetry Configuration - Traces
# Use HTTP/protobuf for frontend since it runs in browser
NEXT_PUBLIC_OTEL_ENABLED=true
NEXT_PUBLIC_OTEL_SERVICE_NAME=saas-platform-frontend
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=http/protobuf

# Frontend OpenTelemetry Configuration - Metrics
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://localhost:4318/v1/metrics

# Frontend OpenTelemetry Configuration - Logs
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://localhost:4318/v1/logs
```

## Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=SaaS Platform
NEXT_PUBLIC_APP_DESCRIPTION=Multi-tenant SaaS application template
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# New Relic Configuration for OpenTelemetry
NEW_RELIC_LICENSE_KEY=your-new-relic-license-key-here

# OpenTelemetry Configuration (Optional for local development)
NEXT_PUBLIC_OTEL_ENABLED=true
NEXT_PUBLIC_OTEL_SERVICE_NAME=saas-platform-frontend-dev

# Frontend OpenTelemetry Configuration - Traces
# Use HTTP/protobuf for frontend since it runs in browser
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://127.0.0.1:4318/v1/traces
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=http/protobuf

# Frontend OpenTelemetry Configuration - Metrics
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://127.0.0.1:4318/v1/metrics

# Frontend OpenTelemetry Configuration - Logs
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://127.0.0.1:4318/v1/logs

# Next.js OpenTelemetry Controls
# Set to 1 to see more detailed Next.js internal spans (increases noise)
# Set to 0 to reduce Next.js internal tracing (recommended for production)
NEXT_OTEL_VERBOSE=0

# Disable Next.js fetch instrumentation if using custom fetch tracing
NEXT_OTEL_FETCH_DISABLED=1
```

## Backend (.env)

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here

# Database Migration Settings (Alembic)
# IMPORTANT: Update 'your-database-password-here' with your actual Supabase database password
DATABASE_URL=postgresql://postgres:your-database-password-here@your-project-ref.supabase.co:5432/postgres

# New Relic Configuration for OpenTelemetry
NEW_RELIC_LICENSE_KEY=your-new-relic-license-key-here

# OpenTelemetry Configuration
OTEL_ENABLED=true
OTEL_SERVICE_NAME=saas-platform-backend
# Traces
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://otel-collector:4317
OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=grpc
OTEL_EXPORTER_OTLP_TRACES_INSECURE=true
# Metrics
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://otel-collector:4317
OTEL_EXPORTER_OTLP_METRICS_PROTOCOL=grpc
OTEL_EXPORTER_OTLP_METRICS_INSECURE=true
# Logs
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://otel-collector:4317
OTEL_EXPORTER_OTLP_LOGS_PROTOCOL=grpc
OTEL_EXPORTER_OTLP_LOGS_INSECURE=true

# OpenTelemetry Configuration - FastAPI Instrumentation
# Exclude health check endpoints from tracing to reduce noise
OTEL_PYTHON_FASTAPI_EXCLUDED_URLS=/health,/health/ready,/health/live
```

## Containerized Development (.env)

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Application Settings
ENVIRONMENT=development
DEBUG=true

# Backend Specific Settings
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
CORS_ORIGINS=["http://localhost:3000", "http://127.0.0.1:3000", "http://frontend:3000", "http://frontend-dev:3000"]

# Frontend Specific Settings
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=SaaS Platform
NEXT_PUBLIC_APP_DESCRIPTION=Multi-tenant SaaS application template

# Database Migration Settings (Alembic)
# Note: For migrations, use the postgres user with database password
# Format: postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres
# IMPORTANT: Update 'your-database-password-here' with your actual Supabase database password
# Special characters in passwords must be URL-encoded:
# # should be encoded as %23
# @ should be encoded as %40
# ! should be encoded as %21
# etc.
DATABASE_URL=postgresql://postgres:your-database-password-here@your-project-ref.supabase.co:5432/postgres

# New Relic Configuration for OpenTelemetry
NEW_RELIC_LICENSE_KEY=your-new-relic-license-key-here
NEW_RELIC_APP_NAME=SaaS Platform

# OpenTelemetry Configuration - Traces
OTEL_ENABLED=true
OTEL_SERVICE_NAME=saas-platform
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://otel-collector:4317
OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=grpc
OTEL_EXPORTER_OTLP_TRACES_INSECURE=true

# OpenTelemetry Configuration - Metrics
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://otel-collector:4317
OTEL_EXPORTER_OTLP_METRICS_PROTOCOL=grpc
OTEL_EXPORTER_OTLP_METRICS_INSECURE=true

# OpenTelemetry Configuration - Logs
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://otel-collector:4317
OTEL_EXPORTER_OTLP_LOGS_PROTOCOL=grpc
OTEL_EXPORTER_OTLP_LOGS_INSECURE=true

# OpenTelemetry Configuration - FastAPI Instrumentation
# Exclude health check endpoints from tracing to reduce noise
OTEL_PYTHON_FASTAPI_EXCLUDED_URLS=/health,/health/ready,/health/live

# Frontend OpenTelemetry Configuration - Traces
# Use HTTP/protobuf for frontend since it runs in browser
NEXT_PUBLIC_OTEL_ENABLED=true
NEXT_PUBLIC_OTEL_SERVICE_NAME=saas-platform-frontend
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=http/protobuf

# Frontend OpenTelemetry Configuration - Metrics
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://localhost:4318/v1/metrics

# Frontend OpenTelemetry Configuration - Logs
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://localhost:4318/v1/logs

# Next.js OpenTelemetry Controls
# Set to 1 to see more detailed Next.js internal spans (increases noise)
# Set to 0 to reduce Next.js internal tracing (recommended for production)
NEXT_OTEL_VERBOSE=0

# Disable Next.js fetch instrumentation if using custom fetch tracing
NEXT_OTEL_FETCH_DISABLED=1
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
6. For OpenTelemetry setup, get your New Relic license key and update the NEW_RELIC_LICENSE_KEY