#!/bin/bash

# 🔍 Script para Verificar Configuración de Staging
# Verifica que todas las variables necesarias estén configuradas correctamente

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENVIRONMENT="staging"

echo -e "${BLUE}🔍 Verificando Configuración de Staging${NC}"
echo "======================================"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found!${NC}"
    echo "Install it with: npm install -g @railway/cli"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Railway${NC}"
    echo "Run: railway login"
    exit 1
fi

# Switch to staging environment
echo -e "\n${BLUE}🔄 Checking staging environment...${NC}"
if ! railway environment use "$ENVIRONMENT" &> /dev/null; then
    echo -e "${RED}❌ Staging environment not found!${NC}"
    echo "Create it with: railway environment add staging"
    exit 1
fi

echo -e "${GREEN}✅ Using staging environment${NC}"

# Function to check variable
check_var() {
    local key=$1
    local description=$2
    local required=${3:-true}
    
    local value=$(railway variables get "$key" 2>/dev/null || echo "")
    
    if [[ -z "$value" ]]; then
        if [[ "$required" == "true" ]]; then
            echo -e "${RED}❌ $key${NC} - ${description}"
            return 1
        else
            echo -e "${YELLOW}⚠️  $key${NC} - ${description} (optional)"
            return 0
        fi
    else
        # Mask sensitive values
        if [[ "$key" == *"SECRET"* ]] || [[ "$key" == *"KEY"* ]] || [[ "$key" == *"TOKEN"* ]] || [[ "$key" == "DATABASE_URL" ]]; then
            masked_value="${value:0:10}...${value: -4}"
            echo -e "${GREEN}✅ $key${NC} - ${description} (${masked_value})"
        else
            echo -e "${GREEN}✅ $key${NC} - ${description} (${value})"
        fi
        return 0
    fi
}

# Track missing required variables
missing_vars=0

echo -e "\n${BLUE}📋 Verificando Variables Públicas...${NC}"

check_var "NODE_ENV" "Node environment" true || ((missing_vars++))
check_var "RAILWAY_ENVIRONMENT" "Railway environment identifier" true || ((missing_vars++))
check_var "TZ" "Timezone" true || ((missing_vars++))
check_var "PORT" "Server port" true || ((missing_vars++))
check_var "HOSTNAME" "Server hostname" true || ((missing_vars++))
check_var "NEXT_TELEMETRY_DISABLED" "Disable Next.js telemetry" true || ((missing_vars++))
check_var "DEFAULT_CURRENCY" "Default currency" true || ((missing_vars++))
check_var "DEFAULT_TIMEZONE" "Default timezone" true || ((missing_vars++))
check_var "SKIP_ENV_VALIDATION" "Skip environment validation" true || ((missing_vars++))

echo -e "\n${BLUE}🌐 Verificando Configuración de Supabase...${NC}"

check_var "NEXT_PUBLIC_SUPABASE_URL" "Supabase project URL" true || ((missing_vars++))
check_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "Supabase anonymous key" true || ((missing_vars++))
check_var "SUPABASE_SERVICE_ROLE_KEY" "Supabase service role key" true || ((missing_vars++))

echo -e "\n${BLUE}🗄️ Verificando Configuración de Base de Datos...${NC}"

check_var "DATABASE_URL" "Database connection string" true || ((missing_vars++))

echo -e "\n${BLUE}🔒 Verificando Secrets de Seguridad...${NC}"

check_var "JWT_SECRET" "JWT secret" true || ((missing_vars++))
check_var "SUPABASE_JWT_SECRET" "Supabase JWT secret" true || ((missing_vars++))
check_var "SESSION_SECRET" "Session secret" true || ((missing_vars++))

echo -e "\n${BLUE}🔗 Verificando Configuración de Dominio...${NC}"

check_var "NEXT_PUBLIC_SITE_URL" "Site URL" true || ((missing_vars++))
check_var "RAILWAY_PUBLIC_DOMAIN" "Railway public domain" false

echo -e "\n${BLUE}💳 Verificando Configuración de Pagos...${NC}"

PAYPAL_MODE=$(railway variables get "PAYPAL_MODE" 2>/dev/null || echo "")
if [[ "$PAYPAL_MODE" == "sandbox" ]]; then
    echo -e "${GREEN}✅ PAYPAL_MODE${NC} - PayPal mode (sandbox) ✓"
else
    if [[ -n "$PAYPAL_MODE" ]]; then
        echo -e "${YELLOW}⚠️  PAYPAL_MODE${NC} - PayPal mode (${PAYPAL_MODE}) - Should be 'sandbox' for staging"
    else
        echo -e "${YELLOW}⚠️  PAYPAL_MODE${NC} - PayPal mode (not set) - Optional for staging"
    fi
fi

check_var "PAYPAL_CLIENT_ID" "PayPal Client ID" false
check_var "PAYPAL_CLIENT_SECRET" "PayPal Client Secret" false

echo -e "\n${BLUE}📧 Verificando Servicios Externos...${NC}"

check_var "RESEND_API_KEY" "Resend API key" false
check_var "CRON_SECRET" "Cron job secret" false

# Summary
echo -e "\n${BLUE}======================================${NC}"
if [[ $missing_vars -eq 0 ]]; then
    echo -e "${GREEN}✅ Todas las variables requeridas están configuradas${NC}"
    echo -e "\n${BLUE}📋 Próximos pasos:${NC}"
    echo "1. Verifica que los valores sean correctos"
    echo "2. Asegúrate de que los secrets sean DIFERENTES de producción"
    echo "3. Verifica que Supabase y Database sean de STAGING"
    echo "4. Despliega: railway up"
    exit 0
else
    echo -e "${RED}❌ Faltan $missing_vars variable(s) requerida(s)${NC}"
    echo -e "\n${YELLOW}💡 Para configurar las variables faltantes:${NC}"
    echo "1. Usa: ./scripts/setup-railway-staging.sh"
    echo "2. O configura manualmente: railway variables set KEY=value"
    exit 1
fi



