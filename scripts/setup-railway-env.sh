#!/bin/bash

# Script para configurar todas las variables de entorno en Railway
# Asegúrate de ejecutar este script después de configurar tu .env.local

echo "Configurando variables de entorno en Railway..."

# Leer variables del archivo .env.local
if [ -f .env.local ]; then
    source .env.local
    
    echo "Configurando NEXT_PUBLIC_SUPABASE_URL..."
    railway variables --set "NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}"
    
    echo "Configurando NEXT_PUBLIC_SUPABASE_ANON_KEY..."
    railway variables --set "NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}"
    
    echo "Configurando SUPABASE_SERVICE_ROLE_KEY..."
    railway variables --set "SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}"
    
    echo "Configurando JWT_SECRET..."
    if [ -f .env ]; then
        source .env
        railway variables --set "JWT_SECRET=${JWT_SECRET}"
    else
        railway variables --set "JWT_SECRET=$(openssl rand -base64 32)"
    fi
    
    echo "Configurando variables adicionales..."
    railway variables --set "NODE_ENV=production"
    railway variables --set "NEXT_TELEMETRY_DISABLED=1"
    railway variables --set "SKIP_ENV_VALIDATION=false"
    
    echo "✅ Variables configuradas exitosamente"
    echo "Verifica las variables con: railway variables"
else
    echo "❌ Error: No se encontró el archivo .env.local"
    echo "Crea el archivo .env.local con las variables de Supabase primero"
fi
