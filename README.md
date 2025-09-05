# Multi-Tenant SaaS Platform

A production-ready template for building multi-tenant SaaS applications with Next.js frontend and Python FastAPI backend.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm
- Docker and Docker Compose
- Python 3.11+ (for backend development)

### Automated Setup

Run the setup script to automatically configure your development environment:

```bash
./scripts/setup.sh
```

This script will:
- Create environment files from examples
- Install frontend dependencies
- Set up the Python virtual environment
- Install backend dependencies

### Easy Container Management

For simplified Docker container management, we provide a comprehensive startup script:

```bash
./start.sh
```

This script allows you to easily start, stop, restart, and manage containers in both development and production modes without remembering complex Docker commands. For detailed usage instructions, see [README_STARTUP.md](README_STARTUP.md).

### Manual Setup

1. **Clone and setup environment**
   ```bash
   git clone <repository-url>
   cd multi-tanent-saas-platform-python-supabase-nextjs
   ```

2. **Frontend Development (Non-containerized)**
   ```bash
   cd frontend
   npm install
   cp .env.local.example .env.local
   # Edit .env.local with your configuration
   npm run dev
   ```

3. **Backend Development (Non-containerized)**
   ```bash
   cd backend
   # Create virtual environment
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env
   # Edit .env with your configuration
   python main.py
   ```

4. **Using Docker for Development (Containerized)**
   ```bash
   # Copy and configure environment file
   cp .env.example .env
   # Edit .env with your configuration (this file is used by Docker containers)
   
   # Run both frontend and backend with development settings (hot reloading)
   docker compose -f docker-compose.dev.yml up --build
   
   # Run both frontend and backend with production settings
   docker compose up --build
   ```

### Production Deployment

```bash
# Build and run production containers
docker compose up --build -d
```

## 🏗️ Architecture

### Frontend (Next.js)
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: Shadcn/ui
- **State Management**: React Query (planned)

### Backend (FastAPI)
- **Framework**: Python FastAPI
- **Database**: Supabase
- **Authentication**: JWT with Supabase Auth
- **Multi-tenancy**: Organization-based isolation

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Scalability**: Horizontal scaling ready
- **Load Balancing**: Nginx (planned)

## 📁 Project Structure

```
├── frontend/                 # Next.js application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # React components
│   │   │   ├── ui/          # Shadcn/ui components
│   │   │   ├── auth/        # Authentication components
│   │   │   ├── dashboard/   # Dashboard components
│   │   │   └── layout/      # Layout components
│   │   ├── lib/            # Utilities and configs
│   │   │   └── api/        # API client
│   │   ├── types/          # TypeScript definitions
│   │   └── hooks/          # Custom React hooks
│   ├── Dockerfile          # Production Docker config
│   ├── Dockerfile.dev      # Development Docker config
│   └── package.json
├── backend/                 # FastAPI application (to be created)
├── docker-compose.yml       # Production Docker Compose
├── docker-compose.dev.yml   # Development Docker Compose
└── README.md
```

## 🛠️ Development

### Frontend Commands

```bash
cd frontend

# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking

# Docker Development
docker build -f Dockerfile.dev -t saas-frontend-dev .
docker run -p 3000:3000 saas-frontend-dev
```

### Backend Commands

```bash
cd backend

# Development with hot reload
uvicorn main:app --reload

# Production
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Code Quality

The project includes:
- **ESLint**: Code linting with Next.js recommended rules
- **TypeScript**: Type safety and better developer experience
- **Prettier**: Code formatting (can be added)
- **Tailwind CSS**: Utility-first styling

## 🔧 Configuration

### Environment Variables

Environment variables can be configured in multiple ways depending on your development approach:

1. **Local Development (Non-containerized)**:
   - Backend: `backend/.env` (copy from `backend/.env.example`)
   - Frontend: `frontend/.env.local` (copy from `frontend/.env.local.example`)
   - **Purpose**: Used only when running services directly on the host machine

2. **Containerized Development**:
   - Root: `.env` (copy from `.env.example`)
   - **Purpose**: Used when running services in Docker containers

**Important**: The service-specific environment files (`backend/.env` and `frontend/.env.local`) are **only for non-containerized local development**. When running services in Docker containers, the root `.env` file is used instead.

For detailed information about environment configuration, see [ENVIRONMENT.md](docs/ENVIRONMENT.md).

#### Supabase Configuration Keys

The Supabase configuration requires different environment variables for frontend and backend:

1. **SUPABASE_SERVICE_KEY**: Used only by the backend for administrative operations (service role key)
2. **SUPABASE_ANON_KEY**: Used by the backend for certain operations (anon key)
3. **NEXT_PUBLIC_SUPABASE_URL**: Used by the frontend (must be prefixed with NEXT_PUBLIC_ to be accessible in browser)
4. **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Used by the frontend (must be prefixed with NEXT_PUBLIC_ to be accessible in browser)

**Important**: Both the root `.env` file and the service-specific files should contain the appropriate Supabase keys for their respective environments.

#### OAuth Providers

The application supports OAuth authentication providers like Google. To enable OAuth:

1. Configure OAuth providers in your Supabase project dashboard
2. Set the redirect URLs in your OAuth provider's dashboard to use the Supabase callback URL:
   - Format: `https://YOUR_SUPABASE_PROJECT_ID.supabase.co/auth/v1/callback`
3. **Note**: You do not need to create any custom callback endpoints in your frontend or backend. Supabase handles the entire OAuth flow for you.

For detailed OAuth configuration instructions, see [ENVIRONMENT.md](docs/ENVIRONMENT.md) and [OAUTH_SETUP.md](docs/OAUTH_SETUP.md).

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=SaaS Platform
NEXT_PUBLIC_APP_DESCRIPTION=Multi-tenant SaaS application template
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

#### Backend (.env)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here
```

#### Containerized Development (.env)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Docker Configuration

The project includes optimized Docker configurations:

- **Production**: Multi-stage build with minimal image size
- **Development**: Volume mounting for hot reloading
- **Standalone**: Next.js standalone output for optimal Docker performance

Both [docker-compose.yml](file:///Users/gauravdhiman/projects/python/multi-tanent-saas-platform-python-supabase-nextjs/docker-compose.yml) and [docker-compose.dev.yml](file:///Users/gauravdhiman/projects/python/multi-tanent-saas-platform-python-supabase-nextjs/docker-compose.dev.yml) now use the `env_file` directive to load environment variables from the root `.env` file, ensuring consistency across development and production environments.

## 🔄 Next Steps

1. **Authentication**: Implement JWT-based auth flow
2. **Multi-tenancy**: Organization-based data isolation
3. **Database**: Supabase schema and migrations
4. **API Integration**: Connect frontend to backend APIs
5. **Testing**: Unit and integration tests
6. **CI/CD**: GitHub Actions workflows
7. **Monitoring**: Logging and metrics

## 📦 Features

### ✅ Completed
- [x] Next.js 15 with TypeScript setup
- [x] Tailwind CSS configuration
- [x] Shadcn/ui component library
- [x] Docker containerization (frontend)
- [x] Type-safe API client foundation
- [x] Project structure and documentation
- [x] FastAPI backend with health endpoints
- [x] Docker containerization (backend)
- [x] Docker Compose setup for development and production
- [x] CORS configuration for frontend-backend communication
- [x] Environment variable management strategy
- [x] Automated setup script
- [x] Consistent environment variable loading across all Docker Compose files
- [x] Password-based authentication with strong password policies
- [x] Google OAuth authentication for signup and login

### 🚧 In Progress
- [ ] Multi-tenant architecture
- [ ] Database integration

### 📋 Planned
- [ ] Subscription billing
- [ ] Real-time features
- [ ] Email notifications
- [ ] Comprehensive testing
- [ ] CI/CD pipeline
- [ ] Production deployment guides

## 🤝 Contributing

1. Follow the established code style and linting rules
2. Use TypeScript for all new code
3. Add tests for new features
4. Update documentation as needed
5. Use conventional commit messages

## 📄 License

[Add your license information here]

---

## 🛟 Support

For questions and support:
- Review the documentation
- Check existing issues
- Create a new issue if needed

Built with ❤️ using Next.js, FastAPI, and modern web technologies.

## Role-Based Access Control (RBAC)

This platform includes a comprehensive Role-Based Access Control (RBAC) system that allows fine-grained control over user permissions. The RBAC system supports:

- **Predefined Roles**: platform_admin, org_admin, and regular_user
- **Custom Roles**: Platform administrators can create additional roles
- **Flexible Permissions**: Permissions follow the format `resource:action`
- **Organization-Level Permissions**: Users can have different roles in different organizations
- **API Security**: All endpoints check user permissions before allowing access

### RBAC Components

1. **Database Schema**: Defined in Alembic migration `backend/alembic/versions/91759229c32b_add_initial_rbac_tables.py`
2. **Backend Services**: Implemented in `backend/src/auth/rbac_service.py`
3. **API Routes**: Defined in `backend/src/auth/rbac_routes.py`
4. **Frontend Service**: Implemented in `frontend/src/services/rbac-service.ts`
5. **React Hook**: Implemented in `frontend/src/hooks/use-rbac.ts`
6. **Dashboard UI**: Implemented in `frontend/src/components/dashboard/rbac-dashboard.tsx`

### Getting Started with RBAC

1. **Database Setup**: Run Alembic migrations with `alembic upgrade head` to create the necessary tables
2. **Default Roles**: The system automatically creates three predefined roles on first run
3. **User Registration**: New users are automatically assigned the `regular_user` role
4. **Role Management**: Platform administrators can manage roles and permissions through the RBAC dashboard

### Documentation

For detailed information about the RBAC system, see:
- [RBAC Documentation](docs/rbac.md) - Comprehensive RBAC system documentation
