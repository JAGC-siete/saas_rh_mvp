#!/bin/bash

# 🚂 Script para Configurar Environment de Staging en Railway
# Este script ayuda a configurar las variables de entorno para staging

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="staging"

echo -e "${BLUE}🚂 Railway Staging Environment Setup${NC}"
echo "======================================"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found!${NC}"
    echo "Install it with: npm install -g @railway/cli"
    exit 1
fi

echo -e "${GREEN}✅ Railway CLI found${NC}"

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Railway${NC}"
    railway login
fi

echo -e "${GREEN}✅ Logged in to Railway${NC}"

# Check if project is linked
if [[ ! -f "railway.json" ]] && [[ ! -f ".railway" ]]; then
    echo -e "${YELLOW}⚠️  Project not linked to Railway${NC}"
    echo "Linking project..."
    railway link
fi

# Switch to staging environment
echo -e "\n${BLUE}🔄 Switching to staging environment...${NC}"
railway environment use "$ENVIRONMENT" 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Staging environment not found${NC}"
    read -p "Do you want to create it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        railway environment add "$ENVIRONMENT"
        railway environment use "$ENVIRONMENT"
        echo -e "${GREEN}✅ Staging environment created${NC}"
    else
        echo -e "${RED}❌ Cannot continue without staging environment${NC}"
        exit 1
    fi
}

echo -e "${GREEN}✅ Using staging environment${NC}"

# Function to set variable
set_var() {
    local key=$1
    local value=$2
    local description=$3
    
    if [[ -z "$value" ]]; then
        echo -e "${YELLOW}⚠️  Skipping $key (empty value)${NC}"
        return
    fi
    
    echo -e "${BLUE}Setting $key...${NC}"
    if railway variables set "$key=$value" &> /dev/null; then
        echo -e "${GREEN}✅ $key set${NC}"
        if [[ -n "$description" ]]; then
            echo "   $description"
        fi
    else
        echo -e "${RED}❌ Failed to set $key${NC}"
    fi
}

# Function to prompt for value
prompt_var() {
    local key=$1
    local description=$2
    local current_value=$3
    
    if [[ -n "$current_value" ]]; then
        echo -e "${BLUE}Current value for $key: ${YELLOW}$current_value${NC}"
        read -p "Enter new value (press Enter to keep current): " new_value
        if [[ -z "$new_value" ]]; then
            echo "$current_value"
        else
            echo "$new_value"
        fi
    else
        read -p "Enter value for $key ($description): " value
        echo "$value"
    fi
}

# Check if .env.local exists
if [[ -f ".env.local" ]]; then
    echo -e "\n${GREEN}✅ Found .env.local${NC}"
    USE_ENV_FILE=true
else
    echo -e "\n${YELLOW}⚠️  No .env.local found. Will prompt for values.${NC}"
    USE_ENV_FILE=false
fi

echo -e "\n${BLUE}📝 Configuring Public Variables...${NC}"

# Public/Operational variables (can be set from env file or defaults)
if [[ "$USE_ENV_FILE" == true ]]; then
    TZ_VAL="America/Tegucigalpa"
    NODE_ENV_VAL="production"
    PORT_VAL="8080"
    HOSTNAME_VAL="0.0.0.0"
    NEXT_TELEMETRY_VAL="1"
    DEFAULT_CURRENCY_VAL="HNL"
    DEFAULT_TIMEZONE_VAL="America/Tegucigalpa"
    SKIP_ENV_VALIDATION_VAL="false"
    RAILWAY_ENV_VAL="staging"
else
    TZ_VAL="America/Tegucigalpa"
    NODE_ENV_VAL="production"
    PORT_VAL="8080"
    HOSTNAME_VAL="0.0.0.0"
    NEXT_TELEMETRY_VAL="1"
    DEFAULT_CURRENCY_VAL="HNL"
    DEFAULT_TIMEZONE_VAL="America/Tegucigalpa"
    SKIP_ENV_VALIDATION_VAL="false"
    RAILWAY_ENV_VAL="staging"
fi

set_var "TZ" "$TZ_VAL"
set_var "NODE_ENV" "$NODE_ENV_VAL"
set_var "PORT" "$PORT_VAL"
set_var "HOSTNAME" "$HOSTNAME_VAL"
set_var "NEXT_TELEMETRY_DISABLED" "$NEXT_TELEMETRY_VAL"
set_var "DEFAULT_CURRENCY" "$DEFAULT_CURRENCY_VAL"
set_var "DEFAULT_TIMEZONE" "$DEFAULT_TIMEZONE_VAL"
set_var "SKIP_ENV_VALIDATION" "$SKIP_ENV_VALIDATION_VAL"
set_var "RAILWAY_ENVIRONMENT" "$RAILWAY_ENV_VAL"

echo -e "\n${BLUE}🔐 Configuring Secret Variables...${NC}"
echo -e "${YELLOW}⚠️  These should be different from production!${NC}"

# Supabase configuration
if [[ "$USE_ENV_FILE" == true ]]; then
    SUPABASE_URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" .env.local | cut -d '=' -f2- | tr -d '"' || echo "")
    SUPABASE_ANON_KEY=$(grep "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local | cut -d '=' -f2- | tr -d '"' || echo "")
    SUPABASE_SERVICE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .env.local | cut -d '=' -f2- | tr -d '"' || echo "")
    
    # Prompt if not found
    if [[ -z "$SUPABASE_URL" ]]; then
        SUPABASE_URL=$(prompt_var "NEXT_PUBLIC_SUPABASE_URL" "Supabase project URL")
    fi
    if [[ -z "$SUPABASE_ANON_KEY" ]]; then
        SUPABASE_ANON_KEY=$(prompt_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "Supabase anonymous key")
    fi
    if [[ -z "$SUPABASE_SERVICE_KEY" ]]; then
        SUPABASE_SERVICE_KEY=$(prompt_var "SUPABASE_SERVICE_ROLE_KEY" "Supabase service role key")
    fi
else
    SUPABASE_URL=$(prompt_var "NEXT_PUBLIC_SUPABASE_URL" "Supabase project URL")
    SUPABASE_ANON_KEY=$(prompt_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "Supabase anonymous key")
    SUPABASE_SERVICE_KEY=$(prompt_var "SUPABASE_SERVICE_ROLE_KEY" "Supabase service role key")
fi

set_var "NEXT_PUBLIC_SUPABASE_URL" "$SUPABASE_URL"
set_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY"
set_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_KEY"

# Site URL for staging
SITE_URL=$(prompt_var "NEXT_PUBLIC_SITE_URL" "Site URL (e.g., https://staging-humanosisu.net)" "")
if [[ -z "$SITE_URL" ]]; then
    SITE_URL="https://staging-humanosisu.net"
fi
set_var "NEXT_PUBLIC_SITE_URL" "$SITE_URL"

# Database URL
if [[ "$USE_ENV_FILE" == true ]]; then
    DATABASE_URL=$(grep "^DATABASE_URL=" .env.local | cut -d '=' -f2- | tr -d '"' || echo "")
fi
if [[ -z "$DATABASE_URL" ]]; then
    DATABASE_URL=$(prompt_var "DATABASE_URL" "Database connection string")
fi
set_var "DATABASE_URL" "$DATABASE_URL"

# Security secrets
if [[ "$USE_ENV_FILE" == true ]]; then
    JWT_SECRET=$(grep "^JWT_SECRET=" .env.local | cut -d '=' -f2- | tr -d '"' || echo "")
    SUPABASE_JWT_SECRET=$(grep "^SUPABASE_JWT_SECRET=" .env.local | cut -d '=' -f2- | tr -d '"' || echo "")
    SESSION_SECRET=$(grep "^SESSION_SECRET=" .env.local | cut -d '=' -f2- | tr -d '"' || echo "")
fi

echo -e "\n${YELLOW}⚠️  IMPORTANT: Use DIFFERENT secrets for staging!${NC}"
JWT_SECRET=$(prompt_var "JWT_SECRET" "JWT secret (different from production)" "$JWT_SECRET")
SUPABASE_JWT_SECRET=$(prompt_var "SUPABASE_JWT_SECRET" "Supabase JWT secret" "$SUPABASE_JWT_SECRET")
SESSION_SECRET=$(prompt_var "SESSION_SECRET" "Session secret" "$SESSION_SECRET")

set_var "JWT_SECRET" "$JWT_SECRET"
set_var "SUPABASE_JWT_SECRET" "$SUPABASE_JWT_SECRET"
set_var "SESSION_SECRET" "$SESSION_SECRET"

# Optional variables
echo -e "\n${BLUE}📦 Configuring Optional Variables...${NC}"

read -p "Configure PayPal? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    set_var "PAYPAL_MODE" "sandbox"
    PAYPAL_CLIENT_ID=$(prompt_var "PAYPAL_CLIENT_ID" "PayPal Client ID (Sandbox)" "")
    PAYPAL_CLIENT_SECRET=$(prompt_var "PAYPAL_CLIENT_SECRET" "PayPal Client Secret (Sandbox)" "")
    set_var "PAYPAL_CLIENT_ID" "$PAYPAL_CLIENT_ID"
    set_var "PAYPAL_CLIENT_SECRET" "$PAYPAL_CLIENT_SECRET"
fi

read -p "Configure Resend API? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [[ "$USE_ENV_FILE" == true ]]; then
        RESEND_KEY=$(grep "^RESEND_API_KEY=" .env.local | cut -d '=' -f2- | tr -d '"' || echo "")
    fi
    RESEND_KEY=$(prompt_var "RESEND_API_KEY" "Resend API Key" "$RESEND_KEY")
    set_var "RESEND_API_KEY" "$RESEND_KEY"
fi

# Summary
echo -e "\n${GREEN}✅ Configuration Complete!${NC}"
echo -e "\n${BLUE}📋 Summary:${NC}"
echo "Environment: $ENVIRONMENT"
echo "Site URL: $SITE_URL"
echo -e "\n${YELLOW}🔄 Next steps:${NC}"
echo "1. Review the configuration in Railway Dashboard"
echo "2. Deploy to staging: ./scripts/deploy-railway.sh --staging"
echo "3. Verify deployment: curl https://your-staging-domain.railway.app/api/health"
echo -e "\n${BLUE}To view all variables:${NC}"
echo "railway environment use $ENVIRONMENT"
echo "railway variables"




