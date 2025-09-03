# Backend - Multi-Tenant SaaS Platform

FastAPI backend for the multi-tenant SaaS platform with health endpoints and Docker support.

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- pip

### Local Development

```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment configuration
cp .env.example .env

# Run the application
python main.py
```

The API will be available at [http://localhost:8000](http://localhost:8000)

## 🏗️ Architecture

### Tech Stack
- **Framework**: FastAPI 0.115.6
- **Python**: 3.11+
- **Settings**: Pydantic Settings for type-safe configuration
- **ASGI Server**: Uvicorn with auto-reload
- **Code Quality**: Black, isort
- **Testing**: pytest with async support

### Project Structure

```
backend/
├── config/                 # Configuration management
│   ├── __init__.py        # Config exports
│   └── settings.py        # Pydantic settings
├── src/                   # Source code modules
│   ├── auth/              # Authentication (future)
│   └── shared/            # Shared utilities
│       ├── middleware/    # Custom middleware
│       ├── exceptions/    # Exception handlers
│       └── utils/         # Utility functions
├── scripts/               # Development and deployment scripts
├── main.py                # FastAPI application entry point
├── requirements.txt       # Python dependencies
├── .env.example          # Environment template
├── Dockerfile            # Production container
├── Dockerfile.dev        # Development container
└── README.md
```

## 🔗 API Endpoints

### Health Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Root API information |
| `/health` | GET | Comprehensive health check |
| `/health/ready` | GET | Readiness check (Kubernetes) |
| `/health/live` | GET | Liveness check (Kubernetes) |

### Example Response

```bash
curl http://localhost:8000/health
```

```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "version": "1.0.0",
  "environment": "development",
  "checks": {
    "api": "ok"
  }
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Application Settings
APP_NAME=SaaS Platform API
APP_VERSION=1.0.0
DEBUG=true
ENVIRONMENT=development

# Server Settings
HOST=0.0.0.0
PORT=8000
RELOAD=true

# CORS Settings
CORS_ORIGINS=["http://localhost:3000", "http://127.0.0.1:3000"]
CORS_CREDENTIALS=true

# Future integrations (commented out in requirements.txt)
# DATABASE_URL=
# SUPABASE_URL=
# SUPABASE_SERVICE_KEY=
# REDIS_URL=
# JWT_SECRET_KEY=
```

### Settings Management

The application uses Pydantic Settings for type-safe configuration:

```python
from config import settings

# Access configuration
print(settings.app_name)
print(settings.debug)
print(settings.cors_origins)
```

## 🐳 Docker

### Development
```bash
# Build development image
docker build -f Dockerfile.dev -t saas-backend-dev .

# Run development container
docker run -p 8000:8000 -v $(pwd):/app saas-backend-dev
```

### Production
```bash
# Build production image
docker build -t saas-backend .

# Run production container
docker run -p 8000:8000 saas-backend
```

### Docker Compose

```bash
# Development with hot reload
docker compose -f docker-compose.dev.yml up --build

# Production deployment
docker compose up --build -d
```

## 🧪 Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=src

# Run specific test file
pytest tests/test_health.py
```

## 🛠️ Development

### Code Quality

```bash
# Format code
black .

# Sort imports
isort .

# Run both
black . && isort .
```

### Adding New Endpoints

1. Create new module in `src/`
2. Define Pydantic models
3. Implement endpoints with proper error handling
4. Add to main application
5. Write tests

### Future Integrations

The backend is prepared for:
- **Supabase**: Database and authentication
- **Redis**: Caching and session storage
- **JWT**: Authentication tokens
- **Middleware**: Tenant context, rate limiting
- **Background Tasks**: Async processing

## 📊 Monitoring

### Health Checks

- **Basic Health**: `/health` - Overall system status
- **Readiness**: `/health/ready` - Ready to receive traffic
- **Liveness**: `/health/live` - Application is running

### Production Considerations

- Health checks included for load balancers
- Non-root user in Docker for security
- Multi-stage Docker builds for optimization
- Structured logging (to be implemented)
- Metrics collection (to be implemented)

## 🔄 Next Steps

1. **Authentication**: JWT-based auth with Supabase
2. **Database**: Supabase integration with models
3. **Multi-tenancy**: Tenant context middleware
4. **API Endpoints**: CRUD operations for core entities
5. **Testing**: Comprehensive test suite
6. **Monitoring**: Logging and metrics
7. **Documentation**: OpenAPI schema optimization

## 🚨 Development Commands

```bash
# Start local development
source .venv/bin/activate && python main.py

# Check code quality
black --check . && isort --check .

# Run full development stack with Docker
docker compose -f docker-compose.dev.yml up --build

# View logs
docker compose -f docker-compose.dev.yml logs -f backend-dev
```

---

For more information, see the main [project README](../README.md).