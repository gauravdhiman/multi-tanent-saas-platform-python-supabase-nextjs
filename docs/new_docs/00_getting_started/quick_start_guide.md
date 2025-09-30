# Quick Start Guide

This guide provides a rapid way to get the Multi-Tenant SaaS Platform up and running using Docker Compose.

## Prerequisites

Ensure you have **Docker & Docker Compose** installed on your system.

## Environment Configuration

1.  **Copy the example environment file**:
    ```bash
    cp .env.example .env
    ```

2.  **Update `.env` with your Supabase credentials**:
    *   `SUPABASE_URL`
    *   `SUPABASE_SERVICE_KEY`
    *   `SUPABASE_ANON_KEY`
    *   `NEXT_PUBLIC_SUPABASE_URL`
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3.  **Update `DATABASE_URL` in `.env` for Alembic migrations**:
    Replace `your-database-password-here` and `your-project-ref` with your actual Supabase database password and project reference.
    ```
    DATABASE_URL=postgresql://postgres:your-database-password-here@your-project-ref.supabase.co:5432/postgres
    ```

4.  **Add your New Relic License Key (Optional)**:
    ```
    NEW_RELIC_LICENSE_KEY=your-new-relic-license-key-here
    ```

## Running the Application

Navigate to the root directory of the project in your terminal.

### Development Mode

Starts the frontend, backend, Supabase Studio, and OpenTelemetry Collector. Ideal for active development.

```bash
./startup.sh dev
```

**Access URLs (Development Mode):**

*   **Frontend**: `http://localhost:3000`
*   **Backend**: `http://localhost:8000`
*   **Supabase Studio**: `http://localhost:54323`

### Production Mode

Starts the frontend, backend, and OpenTelemetry Collector in a production-like environment.

```bash
./startup.sh prod
```

**Access URLs (Production Mode):**

*   **Frontend**: `http://localhost:3000`
*   **Backend**: `http://localhost:8000`

## Other Useful Commands

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