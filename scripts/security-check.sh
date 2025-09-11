#!/bin/bash

# SCRIPT DE VERIFICACIÓN DE SEGURIDAD
# Ejecuta tests de seguridad y validaciones

set -e

echo "🔒 Iniciando verificación de seguridad..."

# 1. Verificar TypeScript
echo "📝 Verificando TypeScript..."
npx tsc --noEmit
echo "✅ TypeScript OK"

# 2. Ejecutar tests de seguridad
echo "🧪 Ejecutando tests de seguridad..."
npx tsx tests/security/schema-validation.test.ts
echo "✅ Tests de seguridad OK"

# 3. Verificar linting (si está configurado)
if [ -f "eslint.config.mjs" ]; then
    echo "🔍 Ejecutando ESLint..."
    npx eslint lib/security/ --ext .ts
    echo "✅ ESLint OK"
fi

# 4. Verificar que no hay vulnerabilidades conocidas
echo "🔍 Verificando vulnerabilidades..."
npm audit --audit-level=moderate
echo "✅ Audit OK"

echo "🎉 Verificación de seguridad completada exitosamente"
