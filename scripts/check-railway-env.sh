#!/bin/bash

# Script para verificar variables de entorno en Railway
echo "🔍 Verificando configuración de Railway..."

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

echo -e "${GREEN}✅ Railway CLI encontrado${NC}"

# Verificar si estamos logueados en Railway
if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ No estás logueado en Railway${NC}"
    echo "Ejecuta: railway login"
    exit 1
fi

echo -e "${GREEN}✅ Logueado en Railway${NC}"

# Obtener información del proyecto
echo -e "\n${YELLOW}📋 Información del proyecto:${NC}"
railway status

# Verificar variables de entorno críticas
echo -e "\n${YELLOW}🔧 Verificando variables de entorno críticas:${NC}"

# Variables requeridas para Supabase
REQUIRED_VARS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "DATABASE_URL"
    "SUPABASE_JWT_SECRET"
    "SESSION_SECRET"
)

for var in "${REQUIRED_VARS[@]}"; do
    value=$(railway variables get "$var" 2>/dev/null)
    if [ $? -eq 0 ] && [ -n "$value" ]; then
        echo -e "${GREEN}✅ $var: Configurada${NC}"
    else
        echo -e "${RED}❌ $var: No configurada${NC}"
    fi
done

# Verificar variables opcionales
echo -e "\n${YELLOW}📝 Verificando variables opcionales:${NC}"

OPTIONAL_VARS=(
    "NEXTAUTH_URL"
    "NEXTAUTH_SECRET"
    "TWILIO_AUTH_TOKEN"
    "TWILIO_ACCOUNT_SID"
    "STRIPE_SECRET_KEY"
    "STRIPE_PUBLISHABLE_KEY"
)

for var in "${OPTIONAL_VARS[@]}"; do
    value=$(railway variables get "$var" 2>/dev/null)
    if [ $? -eq 0 ] && [ -n "$value" ]; then
        echo -e "${GREEN}✅ $var: Configurada${NC}"
    else
        echo -e "${YELLOW}⚠️  $var: No configurada (opcional)${NC}"
    fi
done

# Verificar configuración de Railway
echo -e "\n${YELLOW}🚂 Verificando configuración de Railway:${NC}"

RAILWAY_VARS=(
    "RAILWAY_ENVIRONMENT"
    "RAILWAY_PROJECT_ID"
    "RAILWAY_SERVICE_ID"
    "NODE_ENV"
    "PORT"
)

for var in "${RAILWAY_VARS[@]}"; do
    value=$(railway variables get "$var" 2>/dev/null)
    if [ $? -eq 0 ] && [ -n "$value" ]; then
        echo -e "${GREEN}✅ $var: $value${NC}"
    else
        echo -e "${YELLOW}⚠️  $var: No configurada (Railway la puede configurar automáticamente)${NC}"
    fi
done

echo -e "\n${YELLOW}📖 Instrucciones para configurar variables faltantes:${NC}"
echo "1. Ejecuta: railway variables set NEXT_PUBLIC_SUPABASE_URL='tu_url_aqui'"
echo "2. Ejecuta: railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY='tu_key_aqui'"
echo "3. Ejecuta: railway variables set SUPABASE_SERVICE_ROLE_KEY='tu_service_key_aqui'"
echo "4. Ejecuta: railway variables set DATABASE_URL='tu_database_url_aqui'"
echo "5. Ejecuta: railway variables set SUPABASE_JWT_SECRET='tu_jwt_secret_aqui'"
echo "6. Ejecuta: railway variables set SESSION_SECRET='tu_session_secret_aqui'"

echo -e "\n${YELLOW}🔄 Para redeployar después de configurar variables:${NC}"
echo "railway up"

echo -e "\n${GREEN}✅ Verificación completada${NC}"
