#!/bin/bash

# Script para configurar variables de entorno en Railway
echo "🔧 Configurando variables de entorno en Railway..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar si Railway CLI está instalado
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI no está instalado${NC}"
    echo "Instala Railway CLI: npm install -g @railway/cli"
    exit 1
fi

# Verificar si estamos logueados en Railway
if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ No estás logueado en Railway${NC}"
    echo "Ejecuta: railway login"
    exit 1
fi

# Verificar si existe el archivo .env.local
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ Archivo .env.local no encontrado${NC}"
    echo "Crea el archivo .env.local con tus variables de entorno"
    exit 1
fi

echo -e "${GREEN}✅ Archivo .env.local encontrado${NC}"

# Función para configurar una variable
set_var() {
    local var_name=$1
    local var_value=$2
    
    if [ -n "$var_value" ]; then
        echo -e "${YELLOW}Configurando $var_name...${NC}"
        if railway variables set "$var_name=$var_value" &> /dev/null; then
            echo -e "${GREEN}✅ $var_name configurada${NC}"
        else
            echo -e "${RED}❌ Error configurando $var_name${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  $var_name está vacía, omitiendo...${NC}"
    fi
}

# Cargar variables del archivo .env.local
echo -e "\n${YELLOW}📋 Cargando variables desde .env.local...${NC}"

# Variables críticas para Supabase
NEXT_PUBLIC_SUPABASE_URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" .env.local | cut -d '=' -f2- | tr -d '"')
NEXT_PUBLIC_SUPABASE_ANON_KEY=$(grep "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local | cut -d '=' -f2- | tr -d '"')
SUPABASE_SERVICE_ROLE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .env.local | cut -d '=' -f2- | tr -d '"')
DATABASE_URL=$(grep "^DATABASE_URL=" .env.local | cut -d '=' -f2- | tr -d '"')
SUPABASE_JWT_SECRET=$(grep "^SUPABASE_JWT_SECRET=" .env.local | cut -d '=' -f2- | tr -d '"')
SESSION_SECRET=$(grep "^SESSION_SECRET=" .env.local | cut -d '=' -f2- | tr -d '"')

# Variables opcionales
NEXTAUTH_URL=$(grep "^NEXTAUTH_URL=" .env.local | cut -d '=' -f2- | tr -d '"')
NEXTAUTH_SECRET=$(grep "^NEXTAUTH_SECRET=" .env.local | cut -d '=' -f2- | tr -d '"')
TWILIO_AUTH_TOKEN=$(grep "^TWILIO_AUTH_TOKEN=" .env.local | cut -d '=' -f2- | tr -d '"')
TWILIO_ACCOUNT_SID=$(grep "^TWILIO_ACCOUNT_SID=" .env.local | cut -d '=' -f2- | tr -d '"')
STRIPE_SECRET_KEY=$(grep "^STRIPE_SECRET_KEY=" .env.local | cut -d '=' -f2- | tr -d '"')
STRIPE_PUBLISHABLE_KEY=$(grep "^STRIPE_PUBLISHABLE_KEY=" .env.local | cut -d '=' -f2- | tr -d '"')

# Configurar variables críticas
echo -e "\n${YELLOW}🔧 Configurando variables críticas...${NC}"
set_var "NEXT_PUBLIC_SUPABASE_URL" "$NEXT_PUBLIC_SUPABASE_URL"
set_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_ANON_KEY"
set_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY"
set_var "DATABASE_URL" "$DATABASE_URL"
set_var "SUPABASE_JWT_SECRET" "$SUPABASE_JWT_SECRET"
set_var "SESSION_SECRET" "$SESSION_SECRET"

# Configurar variables opcionales
echo -e "\n${YELLOW}📝 Configurando variables opcionales...${NC}"
set_var "NEXTAUTH_URL" "$NEXTAUTH_URL"
set_var "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET"
set_var "TWILIO_AUTH_TOKEN" "$TWILIO_AUTH_TOKEN"
set_var "TWILIO_ACCOUNT_SID" "$TWILIO_ACCOUNT_SID"
set_var "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY"
set_var "STRIPE_PUBLISHABLE_KEY" "$STRIPE_PUBLISHABLE_KEY"

# Configurar variables de Railway
echo -e "\n${YELLOW}🚂 Configurando variables de Railway...${NC}"
set_var "NODE_ENV" "production"
set_var "NEXT_TELEMETRY_DISABLED" "1"
set_var "DEFAULT_CURRENCY" "HNL"
set_var "DEFAULT_TIMEZONE" "America/Tegucigalpa"

echo -e "\n${GREEN}✅ Variables configuradas exitosamente${NC}"
echo -e "\n${YELLOW}🔄 Para aplicar los cambios, ejecuta:${NC}"
echo "railway up"

echo -e "\n${YELLOW}🔍 Para verificar la configuración, ejecuta:${NC}"
echo "./scripts/check-railway-env.sh"
