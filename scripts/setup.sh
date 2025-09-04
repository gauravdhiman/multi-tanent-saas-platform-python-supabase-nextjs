#!/bin/bash

# Setup script for multi-tenant SaaS platform
# This script helps set up the development environment

echo "🚀 Setting up Multi-Tenant SaaS Platform Development Environment"

# Check if we're on the root directory
if [ ! -f "README.md" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

echo "📁 Creating environment files..."

# Create root .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating root .env file (for containerized development)..."
    cp .env.example .env
    echo "✅ Root .env file created. Please update it with your configuration for Docker containers."
else
    echo "✅ Root .env file already exists (used for containerized development)"
fi

# Create backend .env file if it doesn't exist
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating backend .env file (for non-containerized local development)..."
    cp backend/.env.example backend/.env
    echo "✅ Backend .env file created. Please update it with your configuration for local development."
else
    echo "✅ Backend .env file already exists (used for non-containerized local development)"
fi

# Create frontend .env.local file if it doesn't exist
if [ ! -f "frontend/.env.local" ]; then
    echo "📝 Creating frontend .env.local file (for non-containerized local development)..."
    cp frontend/.env.local.example frontend/.env.local
    echo "✅ Frontend .env.local file created. Please update it with your configuration for local development."
else
    echo "✅ Frontend .env.local file already exists (used for non-containerized local development)"
fi

echo ""
echo "🔧 Installing dependencies..."

# Install frontend dependencies
if [ -d "frontend" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    echo "✅ Frontend dependencies installed"
fi

# Install backend dependencies
if [ -d "backend" ]; then
    echo "🐍 Setting up backend environment..."
    cd backend
    
    # Create virtual environment if it doesn't exist
    if [ ! -d ".venv" ]; then
        echo "🔧 Creating Python virtual environment..."
        python3 -m venv .venv
    fi
    
    # Activate virtual environment
    echo "🔧 Activating virtual environment..."
    source .venv/bin/activate
    
    # Install dependencies
    echo "📦 Installing backend dependencies..."
    pip install -r requirements.txt
    
    cd ..
    echo "✅ Backend environment set up"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update the environment files with your configuration:"
echo "   - Root .env (for containerized development with Docker)"
echo "   - backend/.env (for local backend development without Docker)"
echo "   - frontend/.env.local (for local frontend development without Docker)"
echo ""
echo "2. For local development (without Docker):"
echo "   - Backend: cd backend && source .venv/bin/activate && python main.py"
echo "   - Frontend: cd frontend && npm run dev"
echo ""
echo "3. For containerized development (with Docker):"
echo "   - docker compose -f docker-compose.dev.yml up --build"
echo ""
echo "📖 For more information, see docs/ENVIRONMENT.md"