#!/bin/bash

# Multi-Tenant SaaS Platform Startup Script
# This script simplifies starting and stopping containers in both development and production modes

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Default values
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE_PROD="docker-compose.yml"
COMPOSE_FILE_DEV="docker-compose.dev.yml"
ENV_FILE=".env"

# Required environment variables
REQUIRED_ENV_VARS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_KEY"
)

# Function to print usage
print_usage() {
    echo -e "${BLUE}Multi-Tenant SaaS Platform Startup Script${NC}"
    echo ""
    echo "Usage: ./start.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  start dev     - Start containers in development mode"
    echo "  start prod    - Start containers in production mode"
    echo "  stop dev      - Stop development containers"
    echo "  stop prod     - Stop production containers"
    echo "  restart dev   - Restart development containers"
    echo "  restart prod  - Restart production containers"
    echo "  logs dev      - View development container logs"
    echo "  logs prod     - View production container logs"
    echo "  status        - Show status of all containers"
    echo "  build dev     - Build development images"
    echo "  build prod    - Build production images"
    echo "  help          - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./start.sh start dev"
    echo "  ./start.sh stop prod"
    echo "  ./start.sh restart dev"
    echo "  ./start.sh build dev"
}

# Function to check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Error: Docker is not installed or not in PATH${NC}"
        echo "Please install Docker first: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command -v docker compose &> /dev/null; then
        echo -e "${RED}Error: Docker Compose is not installed or not in PATH${NC}"
        echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    fi
}

# Function to validate .env file
validate_env_file() {
    if [ ! -f "$PROJECT_DIR/$ENV_FILE" ]; then
        echo -e "${RED}Error: $ENV_FILE file not found${NC}"
        echo "Please create $ENV_FILE with your configuration before starting containers"
        echo "You can copy .env.example to $ENV_FILE and update with your values"
        exit 1
    fi
    
    # Check for required environment variables
    local missing_vars=()
    for var in "${REQUIRED_ENV_VARS[@]}"; do
        if ! grep -q "^${var}=" "$PROJECT_DIR/$ENV_FILE" || grep -q "^${var}=$" "$PROJECT_DIR/$ENV_FILE"; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo -e "${RED}Error: Missing required environment variables in $ENV_FILE:${NC}"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        echo ""
        echo "Please set these variables in your $ENV_FILE file"
        exit 1
    fi
}

# Function to check if containers are already running
check_containers_running() {
    local mode=$1
    local compose_file=""
    
    if [ "$mode" = "dev" ]; then
        compose_file="$COMPOSE_FILE_DEV"
    elif [ "$mode" = "prod" ]; then
        compose_file="$COMPOSE_FILE_PROD"
    else
        return 1
    fi
    
    # Check if any containers are running for this compose file
    if docker compose -f "$compose_file" ps --format "table {{.Names}}\t{{.Status}}" | grep -q "Up"; then
        return 0  # Containers are running
    else
        return 1  # Containers are not running
    fi
}

# Function to build development images
build_dev() {
    echo -e "${BLUE}Building development images...${NC}"
    cd "$PROJECT_DIR"
    validate_env_file
    docker compose -f "$COMPOSE_FILE_DEV" build
    echo -e "${GREEN}Development images built successfully!${NC}"
}

# Function to build production images
build_prod() {
    echo -e "${BLUE}Building production images...${NC}"
    cd "$PROJECT_DIR"
    validate_env_file
    docker compose -f "$COMPOSE_FILE_PROD" build
    echo -e "${GREEN}Production images built successfully!${NC}"
}

# Function to start development containers
start_dev() {
    echo -e "${GREEN}Starting development containers...${NC}"
    cd "$PROJECT_DIR"
    validate_env_file
    
    # Check if containers are already running
    if check_containers_running "dev"; then
        echo -e "${YELLOW}Development containers are already running${NC}"
        show_dev_urls
        return 0
    fi
    
    docker compose -f "$COMPOSE_FILE_DEV" up -d
    echo -e "${GREEN}Development containers started successfully!${NC}"
    show_dev_urls
}

# Function to start production containers
start_prod() {
    echo -e "${GREEN}Starting production containers...${NC}"
    cd "$PROJECT_DIR"
    validate_env_file
    
    # Check if containers are already running
    if check_containers_running "prod"; then
        echo -e "${YELLOW}Production containers are already running${NC}"
        show_prod_urls
        return 0
    fi
    
    docker compose -f "$COMPOSE_FILE_PROD" up -d
    echo -e "${GREEN}Production containers started successfully!${NC}"
    show_prod_urls
}

# Function to show development URLs
show_dev_urls() {
    echo ""
    echo -e "${PURPLE}Development URLs:${NC}"
    echo "Frontend: http://localhost:3000"
    echo "Backend: http://localhost:8000"
    echo "Health check: http://localhost:8000/health"
    echo ""
}

# Function to show production URLs
show_prod_urls() {
    echo ""
    echo -e "${PURPLE}Production URLs:${NC}"
    echo "Frontend: http://localhost:3000"
    echo "Backend: http://localhost:8000"
    echo "Health check: http://localhost:8000/health"
    echo ""
}

# Function to stop development containers
stop_dev() {
    echo -e "${YELLOW}Stopping development containers...${NC}"
    cd "$PROJECT_DIR"
    
    # Check if containers are running
    if ! check_containers_running "dev"; then
        echo -e "${YELLOW}Development containers are not running${NC}"
        return 0
    fi
    
    docker compose -f "$COMPOSE_FILE_DEV" down
    echo -e "${GREEN}Development containers stopped successfully!${NC}"
}

# Function to stop production containers
stop_prod() {
    echo -e "${YELLOW}Stopping production containers...${NC}"
    cd "$PROJECT_DIR"
    
    # Check if containers are running
    if ! check_containers_running "prod"; then
        echo -e "${YELLOW}Production containers are not running${NC}"
        return 0
    fi
    
    docker compose -f "$COMPOSE_FILE_PROD" down
    echo -e "${GREEN}Production containers stopped successfully!${NC}"
}

# Function to restart development containers
restart_dev() {
    echo -e "${YELLOW}Restarting development containers...${NC}"
    stop_dev
    sleep 2
    start_dev
}

# Function to restart production containers
restart_prod() {
    echo -e "${YELLOW}Restarting production containers...${NC}"
    stop_prod
    sleep 2
    start_prod
}

# Function to show container logs
show_logs() {
    local mode=$1
    cd "$PROJECT_DIR"
    
    if [ "$mode" = "dev" ]; then
        echo -e "${BLUE}Showing development container logs...${NC}"
        if ! check_containers_running "dev"; then
            echo -e "${YELLOW}Development containers are not running${NC}"
            return 0
        fi
        docker compose -f "$COMPOSE_FILE_DEV" logs -f
    elif [ "$mode" = "prod" ]; then
        echo -e "${BLUE}Showing production container logs...${NC}"
        if ! check_containers_running "prod"; then
            echo -e "${YELLOW}Production containers are not running${NC}"
            return 0
        fi
        docker compose -f "$COMPOSE_FILE_PROD" logs -f
    else
        echo -e "${RED}Invalid mode for logs. Use 'dev' or 'prod'.${NC}"
        exit 1
    fi
}

# Function to show container status
show_status() {
    echo -e "${BLUE}Development containers status:${NC}"
    cd "$PROJECT_DIR"
    docker compose -f "$COMPOSE_FILE_DEV" ps
    
    echo -e "\n${BLUE}Production containers status:${NC}"
    docker compose -f "$COMPOSE_FILE_PROD" ps
}

# Main script logic
main() {
    check_docker
    
    if [ $# -eq 0 ]; then
        print_usage
        exit 1
    fi
    
    local action=$1
    local mode=$2
    
    case $action in
        start)
            if [ "$mode" = "dev" ]; then
                start_dev
            elif [ "$mode" = "prod" ]; then
                start_prod
            else
                echo -e "${RED}Invalid mode. Use 'dev' or 'prod'.${NC}"
                exit 1
            fi
            ;;
        stop)
            if [ "$mode" = "dev" ]; then
                stop_dev
            elif [ "$mode" = "prod" ]; then
                stop_prod
            else
                echo -e "${RED}Invalid mode. Use 'dev' or 'prod'.${NC}"
                exit 1
            fi
            ;;
        restart)
            if [ "$mode" = "dev" ]; then
                restart_dev
            elif [ "$mode" = "prod" ]; then
                restart_prod
            else
                echo -e "${RED}Invalid mode. Use 'dev' or 'prod'.${NC}"
                exit 1
            fi
            ;;
        logs)
            if [ "$mode" = "dev" ] || [ "$mode" = "prod" ]; then
                show_logs "$mode"
            else
                echo -e "${RED}Invalid mode. Use 'dev' or 'prod'.${NC}"
                exit 1
            fi
            ;;
        build)
            if [ "$mode" = "dev" ]; then
                build_dev
            elif [ "$mode" = "prod" ]; then
                build_prod
            else
                echo -e "${RED}Invalid mode. Use 'dev' or 'prod'.${NC}"
                exit 1
            fi
            ;;
        status)
            show_status
            ;;
        help|--help|-h)
            print_usage
            ;;
        *)
            echo -e "${RED}Invalid action: $action${NC}"
            print_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"