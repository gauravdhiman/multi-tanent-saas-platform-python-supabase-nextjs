# Multi-Tenant SaaS Platform Startup Script

This repository includes a convenient startup script ([start.sh](file:///Users/gauravdhiman/projects/python/multi-tanent-saas-platform-python-supabase-nextjs/start.sh)) that simplifies starting, stopping, and managing your Docker containers in both development and production modes.

## Prerequisites

- Docker and Docker Compose must be installed on your system
- Ensure you have the proper `.env` file configured with your settings

## Usage

Make the script executable (already done for you):

```bash
chmod +x start.sh
```

### Starting Containers

**Development Mode:**
```bash
./start.sh start dev
```

**Production Mode:**
```bash
./start.sh start prod
```

### Stopping Containers

**Development Mode:**
```bash
./start.sh stop dev
```

**Production Mode:**
```bash
./start.sh stop prod
```

### Restarting Containers

**Development Mode:**
```bash
./start.sh restart dev
```

**Production Mode:**
```bash
./start.sh restart prod
```

### Building Images

**Development Mode:**
```bash
./start.sh build dev
```

**Production Mode:**
```bash
./start.sh build prod
```

### Viewing Logs

**Development Mode:**
```bash
./start.sh logs dev
```

**Production Mode:**
```bash
./start.sh logs prod
```

### Checking Status

```bash
./start.sh status
```

### Help

```bash
./start.sh help
```

## What Gets Started

### Development Mode
- Frontend development server with hot reloading on port 3000
- Backend development server with hot reloading on port 8000
- Volumes mounted for live code updates
- Development-specific environment variables

### Production Mode
- Frontend production build served by Next.js standalone server on port 3000
- Backend production server on port 8000
- Optimized builds for performance
- Production-specific environment variables

## Accessing Services

After starting the containers, you can access:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Backend Health Check**: http://localhost:8000/health

## Environment Configuration

Make sure your `.env` file is properly configured before starting the containers. The script will validate that required environment variables are set.

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Smart Features

The startup script includes several smart features:

1. **Container Status Check**: Before starting containers, the script checks if they're already running to prevent conflicts
2. **Environment Validation**: The script validates that your `.env` file exists and contains all required variables
3. **Graceful Handling**: If containers are already running, the script will inform you rather than failing
4. **Build Management**: You can build images separately using the `build` command
5. **Color-coded Output**: Clear, color-coded feedback for different operations

## Troubleshooting

If you encounter issues:

1. Make sure Docker is running
2. Check that ports 3000 and 8000 are not already in use
3. Verify your `.env` file contains all required variables
4. Check container logs using `./start.sh logs [dev|prod]`
5. Try building images explicitly with `./start.sh build [dev|prod]`
6. If containers fail to start, check the status with `./start.sh status`