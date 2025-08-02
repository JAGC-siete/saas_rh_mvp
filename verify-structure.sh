#!/bin/bash

# Script para verificar la estructura de la aplicación
# Ejecutar después del deploy

echo "🔍 VERIFICANDO ESTRUCTURA DE LA APLICACIÓN"
echo "=========================================="

# 1. Verificar que la aplicación responde
echo "1. Verificando respuesta de la aplicación..."
curl -s -o /dev/null -w "Status: %{http_code}\n" "https://humanosisu.net"

# 2. Verificar endpoint de diagnóstico (sin sesión)
echo "2. Verificando endpoint de diagnóstico..."
curl -s "https://humanosisu.net/api/debug-complete" | jq '.' 2>/dev/null || echo "Respuesta sin formato JSON"

# 3. Verificar estructura de archivos
echo "3. Verificando estructura de archivos..."
ls -la pages/api/payroll/
ls -la components/
ls -la lib/

# 4. Verificar variables de entorno (sin mostrar valores)
echo "4. Verificando variables de entorno..."
if [ -f ".env.local" ]; then
    echo "✅ .env.local existe"
    echo "Variables configuradas:"
    grep -E "^NEXT_PUBLIC_|^SUPABASE_" .env.local | cut -d'=' -f1 | sort
else
    echo "❌ .env.local no existe"
fi

# 5. Verificar Railway status
echo "5. Verificando estado de Railway..."
railway status

echo "✅ Verificación completada"
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Ejecutar verify-all-tables.sql en Supabase SQL Editor"
echo "2. Ejecutar create-attendance-data.sql para crear datos de prueba"
echo "3. Probar la aplicación en https://humanosisu.net/payroll" 