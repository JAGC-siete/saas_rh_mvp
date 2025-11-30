#!/bin/bash

# Script para desplegar el servicio Hikvision Proxy a Railway
# Uso: ./scripts/deploy-hikvision-proxy.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Despliegue del Servicio Hikvision Proxy a Railway${NC}"
echo "=================================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI no está instalado${NC}"
    echo "Instala Railway CLI: npm install -g @railway/cli"
    exit 1
fi

echo -e "${GREEN}✅ Railway CLI encontrado${NC}"

# Check if logged in to Railway
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  No estás logueado en Railway${NC}"
    echo "Ejecutando: railway login"
    railway login
fi

echo -e "${GREEN}✅ Sesión de Railway activa${NC}"

# Navigate to proxy service directory
PROXY_DIR="services/hikvision-proxy"
if [ ! -d "$PROXY_DIR" ]; then
    echo -e "${RED}❌ Error: No se encontró el directorio $PROXY_DIR${NC}"
    exit 1
fi

echo -e "${BLUE}📁 Cambiando al directorio del servicio proxy...${NC}"
cd "$PROXY_DIR"

# Check if railway.toml exists
if [ ! -f "railway.toml" ]; then
    echo -e "${RED}❌ Error: No se encontró railway.toml en $PROXY_DIR${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Configuración de Railway encontrada${NC}"

# Check if Dockerfile exists
if [ ! -f "Dockerfile" ]; then
    echo -e "${RED}❌ Error: No se encontró Dockerfile en $PROXY_DIR${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dockerfile encontrado${NC}"

# Ask if user wants to initialize a new service or use existing
echo ""
echo -e "${YELLOW}¿Qué deseas hacer?${NC}"
echo "1) Crear un nuevo servicio en Railway para el proxy"
echo "2) Usar un servicio existente"
echo "3) Solo desplegar (asume que ya está configurado)"
read -p "Opción [1/2/3]: " option

case $option in
    1)
        echo -e "${BLUE}🔧 Inicializando nuevo servicio en Railway...${NC}"
        echo -e "${YELLOW}Nota: Necesitarás crear el servicio manualmente desde el dashboard o usar: railway link${NC}"
        echo ""
        echo "Opciones:"
        echo "- Crear servicio nuevo: railway service create"
        echo "- Vincular servicio existente: railway link"
        echo ""
        read -p "Presiona Enter para continuar con el despliegue..."
        ;;
    2)
        echo -e "${BLUE}🔗 Vinculando a servicio existente...${NC}"
        railway link
        ;;
    3)
        echo -e "${BLUE}🚀 Iniciando despliegue...${NC}"
        ;;
    *)
        echo -e "${RED}❌ Opción inválida${NC}"
        exit 1
        ;;
esac

# Configure required environment variables
echo ""
echo -e "${YELLOW}📋 Configurando variables de entorno requeridas...${NC}"

# Configure Supabase credentials
# IMPORTANT: These values should be set manually in Railway Dashboard or provided via environment variables
# Never hardcode credentials in scripts

echo -e "${YELLOW}⚠️  Configuración de variables de Supabase requerida${NC}"
echo "   Por favor configura las siguientes variables en Railway Dashboard:"
echo "   - NEXT_PUBLIC_SUPABASE_URL"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo ""
read -p "¿Deseas configurar NEXT_PUBLIC_SUPABASE_URL ahora? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Ingresa NEXT_PUBLIC_SUPABASE_URL: " SUPABASE_URL
    if [ -n "$SUPABASE_URL" ]; then
        railway variables --set "NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL"
        echo -e "${GREEN}✅ NEXT_PUBLIC_SUPABASE_URL configurada${NC}"
    fi
fi

read -p "¿Deseas configurar SUPABASE_SERVICE_ROLE_KEY ahora? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Ingresa SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_KEY
    if [ -n "$SUPABASE_KEY" ]; then
        railway variables --set "SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_KEY"
        echo -e "${GREEN}✅ SUPABASE_SERVICE_ROLE_KEY configurada${NC}"
    fi
fi

# Set PORT
echo -e "${BLUE}📌 Configurando PORT=3001...${NC}"
railway variables --set "PORT=3001"
echo -e "${GREEN}✅ PORT configurada${NC}"

echo -e "${GREEN}✅ Todas las variables requeridas están configuradas${NC}"

# Optional: Check for Redis URL (just inform, don't set)
echo -e "${YELLOW}ℹ️  Nota: REDIS_URL es opcional (para BullMQ colas)${NC}"
echo "   El servicio funcionará sin Redis, pero las colas no estarán disponibles"

# Deploy
echo ""
echo -e "${BLUE}🚀 Iniciando despliegue a Railway...${NC}"
echo -e "${YELLOW}Esto puede tomar unos minutos...${NC}"
echo ""

railway up

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Despliegue completado exitosamente${NC}"
    echo ""
    echo -e "${BLUE}📋 Próximos pasos:${NC}"
    echo "1. Verifica el despliegue en el dashboard de Railway"
    echo "2. Obtén la URL del servicio desplegado"
    echo "3. Configura HIKVISION_PROXY_URL en tu servicio principal del SaaS:"
    echo "   railway variables set HIKVISION_PROXY_URL='https://tu-proxy-service.railway.app'"
    echo "4. Prueba el health check: curl https://tu-proxy-service.railway.app/health"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Error en el despliegue${NC}"
    echo "Revisa los logs en Railway para más detalles"
    exit 1
fi

