# Setup Guide

This guide provides instructions on how to set up and configure the Multi-Tenant SaaS Platform for both local development and containerized environments.

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Docker & Docker Compose**: For containerized development and deployment.
*   **Python 3.9+**: For the FastAPI backend (if running non-containerized).
*   **Node.js 18+ & npm/yarn**: For the Next.js frontend (if running non-containerized).
*   **Supabase Account**: For database, authentication, and storage services.
*   **New Relic Account (Optional)**: For OpenTelemetry observability.

## Environment Configuration

The project uses different environment files depending on your development approach:

1.  **Local Development (Non-containerized)**:
    *   Backend: `backend/.env` (copy from `backend/.env.example`)
    *   Frontend: `frontend/.env.local` (copy from `frontend/.env.local.example`)

2.  **Containerized Development**:
    *   Root: `.env` (copy from `.env.example`)

**Important**: The service-specific environment files (`backend/.env` and `frontend/.env.local`) are **only for non-containerized local development**. When running services in Docker containers, the root `.env` file is used instead.

### Supabase Configuration

#### Required Keys

The Supabase configuration requires different environment variables for frontend and backend:

1.  **SUPABASE_SERVICE_KEY**: Used only by the backend for administrative operations (service role key)
2.  **SUPABASE_ANON_KEY**: Used by the backend for certain operations (anon key)
3.  **NEXT_PUBLIC_SUPABASE_URL**: Used by the frontend (must be prefixed with NEXT_PUBLIC_ to be accessible in browser)
4.  **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Used by the frontend (must be prefixed with NEXT_PUBLIC_ to be accessible in browser)

#### Getting Your Supabase Database Password

To configure the `DATABASE_URL` environment variable for Alembic migrations, you'll need your Supabase database password:

1.  Go to your Supabase project dashboard
2.  Navigate to "Settings" → "Database"
3.  Under "Connection Info", you'll see:
    *   **Host**: Your project reference followed by `.supabase.co`
    *   **Port**: 5432
    *   **User**: postgres
    *   **Password**: This is your database password (different from your Supabase project password)
4.  Use this information to construct your `DATABASE_URL`:
    ```
    postgresql://postgres:[DATABASE-PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres
    ```

#### OAuth Providers

To enable OAuth providers like Google, you need to:

1.  Configure the OAuth provider in your Supabase project dashboard:
    *   Go to Authentication → Providers
    *   Enable the desired provider (e.g., Google)
    *   Configure the provider settings with your OAuth credentials

2.  Set the redirect URLs in your OAuth provider's dashboard:
    *   Use the Supabase callback URL: `https://YOUR_SUPABASE_PROJECT_ID.supabase.co/auth/v1/callback`
    *   You can find this URL in your Supabase dashboard under Authentication → Settings

**Note**: You do not need to create any custom callback endpoints in your frontend or backend. Supabase handles the entire OAuth flow for you.

For detailed instructions on setting up OAuth providers, see `new_docs/01_core_concepts/oauth_setup.md`.

### OpenTelemetry Configuration

The project uses OpenTelemetry for observability with New Relic as the backend. For detailed information about the OpenTelemetry implementation, see `new_docs/01_core_concepts/opentelemetry_implementation.md`.

#### New Relic License Key

All environments require a New Relic license key:

```
NEW_RELIC_LICENSE_KEY=your-new-relic-license-key-here
```

#### Backend OpenTelemetry Configuration

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

#### Frontend OpenTelemetry Configuration

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

#### Containerized Environment OpenTelemetry Configuration

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

## Quick Start Guide

This project includes a `startup.sh` script to simplify the process of getting your development environment up and running with Docker Compose.

### Usage

To use the `startup.sh` script, navigate to the root directory of the project in your terminal.

#### Development Mode

Starts the frontend, backend, Supabase Studio, and OpenTelemetry Collector. This mode is ideal for active development, offering hot-reloading for both frontend and backend services.

```bash
./startup.sh dev
```

**Access URLs (Development Mode):**

*   **Frontend**: `http://localhost:3000`
*   **Backend**: `http://localhost:8000`
*   **Supabase Studio**: `http://localhost:54323`
*   **OpenTelemetry Collector**: `http://localhost:4318` (for HTTP/protobuf)

#### Production Mode

Starts the frontend, backend, and OpenTelemetry Collector in a production-like environment. Supabase Studio is not included in this mode.

```bash
./startup.sh prod
```

**Access URLs (Production Mode):**

*   **Frontend**: `http://localhost:3000`
*   **Backend**: `http://localhost:8000`
*   **OpenTelemetry Collector**: `http://localhost:4318` (for HTTP/protobuf)

#### Other Commands

*   **Stop all services**:
    ```bash
    ./startup.sh stop
    ```
*   **Restart all services**:
    ```bash
    ./startup.sh restart
    ```
*   **Build Docker images**:
    ```bash
    ./startup.sh build
    ```
*   **View logs**:
    ```bash
    ./startup.sh logs
    ```
*   **Check service status**:
    ```bash
    ./startup.sh ps
    ```

### Environment Variables for `startup.sh`

The `startup.sh` script relies on the root `.env` file for configuration. Ensure this file is properly set up as described in the "Environment Configuration" section.

### Troubleshooting

*   **Port Conflicts**: If you encounter port conflicts, ensure no other services are running on ports `3000`, `8000`, `54323`, or `4318`.
*   **Docker Issues**: If Docker commands fail, try restarting your Docker daemon or rebuilding images.
*   **Supabase Connection**: Verify your Supabase environment variables (URL, keys) are correct in your `.env` file.