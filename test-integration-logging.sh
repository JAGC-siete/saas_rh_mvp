#!/bin/bash

# Script de prueba de integración para el sistema de logging
# Como David probó su honda antes de enfrentar a Goliat

echo "🙏 PRUEBA DE INTEGRACIÓN - SISTEMA DE LOGGING"
echo "============================================="

# 1. Verificar que los archivos existen
echo -e "\n1️⃣ Verificando archivos del sistema de logging..."
files_to_check=(
    "lib/logger.ts"
    "lib/logger-client.ts"
    "middleware.ts"
    "pages/api/health.ts"
    "pages/api/attendance/register.ts"
    "components/PayrollManager.tsx"
)

all_files_exist=true
for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file existe"
    else
        echo "❌ $file NO ENCONTRADO"
        all_files_exist=false
    fi
done

if [ "$all_files_exist" = false ]; then
    echo "❌ Faltan archivos críticos"
    exit 1
fi

# 2. Verificar sintaxis TypeScript
echo -e "\n2️⃣ Verificando sintaxis TypeScript..."
if command -v tsc &> /dev/null; then
    npx tsc --noEmit --skipLibCheck || {
        echo "❌ Errores de TypeScript encontrados"
        exit 1
    }
    echo "✅ Sintaxis TypeScript correcta"
else
    echo "⚠️  TypeScript no instalado globalmente - saltando verificación de tipos"
    echo "   Para instalar: npm install -g typescript"
fi

# 3. Ejecutar pruebas del logger
echo -e "\n3️⃣ Ejecutando pruebas del logger..."
tsx test-logger-compact.ts || {
    echo "❌ Las pruebas del logger fallaron"
    exit 1
}

# 4. Verificar que el build funciona
echo -e "\n4️⃣ Verificando que el proyecto puede compilar..."
npm run build > /dev/null 2>&1 && {
    echo "✅ Build completado exitosamente"
} || {
    echo "❌ El build falló"
    echo "   Ejecuta 'npm run build' para ver los errores"
    exit 1
}

# 5. Verificar variables de entorno
echo -e "\n5️⃣ Verificando configuración de variables de entorno..."
if [ -f ".env.local" ]; then
    echo "✅ Archivo .env.local existe"
else
    echo "⚠️  No hay .env.local - asegúrate de configurar las variables en producción"
fi

echo -e "\n✨ TODAS LAS PRUEBAS PASARON - Sistema listo para merge"
echo "📖 'Examínenlo todo y retengan lo bueno' - 1 Tesalonicenses 5:21"