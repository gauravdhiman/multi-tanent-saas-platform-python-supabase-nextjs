# Multi-Tenant SaaS Platform

A production-ready template for building multi-tenant SaaS applications with Next.js frontend and Python FastAPI backend.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm
- Docker and Docker Compose
- Python 3.11+ (for backend development)

### Development Setup

1. **Clone and setup environment**
   ```bash
   git clone <repository-url>
   cd multi-tanent-saas-platform-python-supabase-nextjs
   ```

2. **Frontend Development**
   ```bash
   cd frontend
   npm install
   cp .env.local.example .env.local
   # Edit .env.local with your configuration
   npm run dev
   ```

3. **Using Docker for Development**
   ```bash
   # Run both frontend and backend
   docker-compose -f docker-compose.dev.yml up --build
   ```

### Production Deployment

```bash
# Build and run production containers
docker-compose up --build -d
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

### Code Quality

The project includes:
- **ESLint**: Code linting with Next.js recommended rules
- **TypeScript**: Type safety and better developer experience
- **Prettier**: Code formatting (can be added)
- **Tailwind CSS**: Utility-first styling

## 🔧 Configuration

### Environment Variables

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=SaaS Platform
NEXT_PUBLIC_APP_DESCRIPTION=Multi-tenant SaaS application template
```

### Docker Configuration

The project includes optimized Docker configurations:

- **Production**: Multi-stage build with minimal image size
- **Development**: Volume mounting for hot reloading
- **Standalone**: Next.js standalone output for optimal Docker performance

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

### 🚧 In Progress
- [ ] Authentication system
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