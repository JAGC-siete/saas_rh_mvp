#!/bin/bash

# 🚀 Professional Railway Deployment Script
# HR SaaS Sistema de Recursos Humanos

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="hr-saas-frontend"
STAGING_BRANCH="develop"
PRODUCTION_BRANCH="main"

echo -e "${BLUE}🚀 Railway Deployment Script${NC}"
echo "=================================="

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# Check if Railway CLI is installed
check_railway_cli() {
    if ! command -v railway &> /dev/null; then
        print_error "Railway CLI not found!"
        echo "Install it with: npm install -g @railway/cli"
        exit 1
    fi
    print_status "Railway CLI found"
}

# Check current branch
check_branch() {
    CURRENT_BRANCH=$(git branch --show-current)
    print_info "Current branch: $CURRENT_BRANCH"
    
    if [[ "$CURRENT_BRANCH" != "$STAGING_BRANCH" && "$CURRENT_BRANCH" != "$PRODUCTION_BRANCH" ]]; then
        print_warning "You're not on a deployment branch ($STAGING_BRANCH or $PRODUCTION_BRANCH)"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Check for uncommitted changes
check_git_status() {
    if [[ -n $(git status --porcelain) ]]; then
        print_warning "You have uncommitted changes!"
        git status --short
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_status "Git status clean"
    fi
}

# Run pre-deployment checks
run_checks() {
    print_info "Running pre-deployment checks..."
    
    # Check if package.json exists
    if [[ ! -f "package.json" ]]; then
        print_error "package.json not found!"
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version)
    print_status "Node.js version: $NODE_VERSION"
    
    # Check if .env.local exists for local testing
    if [[ -f ".env.local" ]]; then
        print_status "Local environment file found"
    else
        print_warning "No .env.local found"
    fi
    
    # Test build locally (optional)
    if [[ "$1" == "--test-build" ]]; then
        print_info "Testing build locally..."
        npm run build
        print_status "Local build successful"
    fi
}

# Deploy to Railway
deploy_to_railway() {
    local environment=$1
    
    print_info "Deploying to Railway ($environment)..."
    
    # Login check
    if ! railway whoami &> /dev/null; then
        print_warning "Not logged in to Railway"
        railway login
    fi
    
    # Link project if not already linked
    if [[ ! -f "railway.json" ]]; then
        print_info "Linking Railway project..."
        railway link
    fi
    
    # Deploy
    print_info "Starting deployment..."
    railway deploy
    
    if [[ $? -eq 0 ]]; then
        print_status "Deployment successful!"
        
        # Get deployment URL
        DEPLOY_URL=$(railway domain)
        if [[ -n "$DEPLOY_URL" ]]; then
            print_status "Application URL: https://$DEPLOY_URL"
        fi
    else
        print_error "Deployment failed!"
        exit 1
    fi
}

# Health check
health_check() {
    local url=$1
    
    if [[ -n "$url" ]]; then
        print_info "Performing health check..."
        
        # Wait a bit for deployment to be ready
        sleep 10
        
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$url/api/health" || echo "000")
        
        if [[ "$HTTP_STATUS" == "200" ]]; then
            print_status "Health check passed"
        else
            print_warning "Health check failed (HTTP $HTTP_STATUS)"
        fi
    fi
}

# Environment setup
setup_environment() {
    print_info "Checking environment variables..."
    
    # Check required environment variables
    REQUIRED_VARS=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if railway variables get "$var" &> /dev/null; then
            print_status "$var is set"
        else
            print_warning "$var is not set in Railway"
        fi
    done
}

# Main deployment function
main() {
    local environment=""
    local test_build=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --staging)
                environment="staging"
                shift
                ;;
            --production)
                environment="production"
                shift
                ;;
            --test-build)
                test_build=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --staging      Deploy to staging"
                echo "  --production   Deploy to production"
                echo "  --test-build   Test build locally before deploy"
                echo "  --help         Show this help"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Auto-detect environment if not specified
    if [[ -z "$environment" ]]; then
        CURRENT_BRANCH=$(git branch --show-current)
        if [[ "$CURRENT_BRANCH" == "$PRODUCTION_BRANCH" ]]; then
            environment="production"
        elif [[ "$CURRENT_BRANCH" == "$STAGING_BRANCH" ]]; then
            environment="staging"
        else
            environment="staging"  # Default to staging
        fi
    fi
    
    print_info "Target environment: $environment"
    
    # Production confirmation
    if [[ "$environment" == "production" ]]; then
        print_warning "⚠️  PRODUCTION DEPLOYMENT ⚠️"
        read -p "Are you sure you want to deploy to production? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Deployment cancelled"
            exit 0
        fi
    fi
    
    # Run all checks
    check_railway_cli
    check_branch
    check_git_status
    
    if [[ "$test_build" == true ]]; then
        run_checks --test-build
    else
        run_checks
    fi
    
    setup_environment
    
    # Deploy
    deploy_to_railway "$environment"
    
    # Health check
    DEPLOY_URL=$(railway domain 2>/dev/null || echo "")
    if [[ -n "$DEPLOY_URL" ]]; then
        health_check "https://$DEPLOY_URL"
    fi
    
    print_status "🎉 Deployment completed successfully!"
    print_info "Environment: $environment"
    
    if [[ -n "$DEPLOY_URL" ]]; then
        print_info "URL: https://$DEPLOY_URL"
    fi
}

# Trap errors
trap 'print_error "Deployment failed at line $LINENO"' ERR

# Run main function with all arguments
main "$@"
