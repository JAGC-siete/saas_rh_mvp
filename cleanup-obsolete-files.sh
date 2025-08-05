#!/bin/bash

# 🧹 SCRIPT DE LIMPIEZA DE ARCHIVOS OBSOLETOS
# ⚠️ EJECUTAR CON PRECAUCIÓN - HACER BACKUP ANTES

set -e  # Exit on any error

echo "🧹 INICIANDO LIMPIEZA DE ARCHIVOS OBSOLETOS"
echo "=========================================="

# Crear backup del proyecto
echo "📦 Creando backup del proyecto..."
BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup de archivos críticos
cp -r lib/ "$BACKUP_DIR/" 2>/dev/null || true
cp -r components/ "$BACKUP_DIR/" 2>/dev/null || true
cp -r pages/ "$BACKUP_DIR/" 2>/dev/null || true
cp package.json "$BACKUP_DIR/" 2>/dev/null || true
cp next.config.js "$BACKUP_DIR/" 2>/dev/null || true
cp middleware.ts "$BACKUP_DIR/" 2>/dev/null || true
cp .env.local "$BACKUP_DIR/" 2>/dev/null || true

echo "✅ Backup creado en: $BACKUP_DIR"

# FASE 1: Archivos de Backup Automáticos
echo ""
echo "🚨 FASE 1: Eliminando archivos de backup automáticos..."
find . -name "*.backup.*" -type f -delete
echo "✅ Archivos de backup eliminados"

# FASE 2: Scripts de Diagnóstico Obsoletos
echo ""
echo "🔧 FASE 2: Eliminando scripts de diagnóstico obsoletos..."
rm -f diagnose-*.js 2>/dev/null || true
rm -f debug-*.js 2>/dev/null || true
rm -f test-login-flow.js 2>/dev/null || true
rm -f test-dashboard-api.js 2>/dev/null || true
rm -f test-api-endpoint.js 2>/dev/null || true
rm -f diagnose-dashboard-issue.js 2>/dev/null || true
echo "✅ Scripts de diagnóstico eliminados"

# FASE 3: Scripts de Usuario Obsoletos
echo ""
echo "👤 FASE 3: Eliminando scripts de usuario obsoletos..."
rm -f create-jorge-user.js 2>/dev/null || true
rm -f create-jorge-profile.js 2>/dev/null || true
rm -f reset-jorge-password.js 2>/dev/null || true
rm -f check-gustavo-status.js 2>/dev/null || true
rm -f check-gustavo-simple.js 2>/dev/null || true
rm -f create-gustavo-argueta.sql 2>/dev/null || true
rm -f create-gustavo-argueta-safe.sql 2>/dev/null || true
rm -f update-gustavo-password.sql 2>/dev/null || true
rm -f update-gustavo-password-fixed.sql 2>/dev/null || true
rm -f fix-gustavo-user-safe.sql 2>/dev/null || true
echo "✅ Scripts de usuario eliminados"

# FASE 4: Configuraciones Duplicadas
echo ""
echo "⚙️ FASE 4: Limpiando configuraciones duplicadas..."
# Mantener solo eslint.config.mjs
rm -f eslint.config.cjs 2>/dev/null || true
rm -f .eslintrc.json 2>/dev/null || true

# Mantener solo Dockerfile principal
rm -f Dockerfile.railway 2>/dev/null || true
rm -f Dockerfile.railway.ultra-simple 2>/dev/null || true
echo "✅ Configuraciones duplicadas eliminadas"

# FASE 5: Directorios Obsoletos (con confirmación)
echo ""
echo "📁 FASE 5: Verificando directorios obsoletos..."
if [ -d "asistencia" ]; then
    echo "⚠️  Directorio 'asistencia' encontrado. ¿Eliminar? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        rm -rf asistencia/
        echo "✅ Directorio 'asistencia' eliminado"
    else
        echo "⏭️  Saltando eliminación de 'asistencia'"
    fi
fi

if [ -d "nomina" ]; then
    echo "⚠️  Directorio 'nomina' encontrado. ¿Eliminar? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        rm -rf nomina/
        echo "✅ Directorio 'nomina' eliminado"
    else
        echo "⏭️  Saltando eliminación de 'nomina'"
    fi
fi

if [ -d "bases_de_datos" ]; then
    echo "⚠️  Directorio 'bases_de_datos' encontrado. ¿Eliminar? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        rm -rf bases_de_datos/
        echo "✅ Directorio 'bases_de_datos' eliminado"
    else
        echo "⏭️  Saltando eliminación de 'bases_de_datos'"
    fi
fi

if [ -d "test-files" ]; then
    echo "⚠️  Directorio 'test-files' encontrado. ¿Eliminar? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        rm -rf test-files/
        echo "✅ Directorio 'test-files' eliminado"
    else
        echo "⏭️  Saltando eliminación de 'test-files'"
    fi
fi

# FASE 6: Archivos SQL Obsoletos
echo ""
echo "🗄️ FASE 6: Eliminando archivos SQL obsoletos..."
rm -f paragon_employees_migration.sql 2>/dev/null || true
rm -f migration_employee_data.sql 2>/dev/null || true
rm -f migration_employee_data_ui.sql 2>/dev/null || true
rm -f validation_employee_migration.sql 2>/dev/null || true
rm -f sync_tables.sql 2>/dev/null || true
rm -f gamification_tables.sql 2>/dev/null || true
rm -f create-test-employees.sql 2>/dev/null || true
echo "✅ Archivos SQL obsoletos eliminados"

# FASE 7: Scripts de Verificación Obsoletos
echo ""
echo "✅ FASE 7: Eliminando scripts de verificación obsoletos..."
rm -f verify-supabase-ui-sync.js 2>/dev/null || true
rm -f verify-data-sync.js 2>/dev/null || true
rm -f verify-restoration.js 2>/dev/null || true
rm -f verify-real-employees.js 2>/dev/null || true
rm -f verify-correct-attendance.js 2>/dev/null || true
rm -f verify-integration-issues.js 2>/dev/null || true
rm -f verify-integration-fixes.js 2>/dev/null || true
rm -f audit-supabase-rls.js 2>/dev/null || true
rm -f audit-rls-simple.js 2>/dev/null || true
rm -f audit-rls-railway.js 2>/dev/null || true
rm -f apply-rls-fix.js 2>/dev/null || true
rm -f fix-supabase-permissions.js 2>/dev/null || true
echo "✅ Scripts de verificación eliminados"

# FASE 8: Scripts de Deployment Obsoletos
echo ""
echo "🚀 FASE 8: Eliminando scripts de deployment obsoletos..."
rm -f railway-debug.sh 2>/dev/null || true
rm -f railway-deploy.sh 2>/dev/null || true
rm -f railway-diagnosis.sh 2>/dev/null || true
rm -f railway-push.sh 2>/dev/null || true
rm -f deploy-railway.sh 2>/dev/null || true
rm -f deploy_k8s_services.sh 2>/dev/null || true
rm -f test-integration-logging.sh 2>/dev/null || true
rm -f test-onboarding.sh 2>/dev/null || true
rm -f test-onboarding-local.sh 2>/dev/null || true
echo "✅ Scripts de deployment eliminados"

# FASE 9: Limpiar archivos temporales
echo ""
echo "🧹 FASE 9: Limpiando archivos temporales..."
rm -f tsconfig.tsbuildinfo 2>/dev/null || true
rm -f planilla_julio_q2.pdf.backup 2>/dev/null || true
rm -f integration-verification-report.json 2>/dev/null || true
echo "✅ Archivos temporales eliminados"

# Verificar archivos críticos
echo ""
echo "🔍 Verificando archivos críticos..."
CRITICAL_FILES=("package.json" "next.config.js" "middleware.ts" ".env.local")
for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file - OK"
    else
        echo "❌ $file - FALTANTE"
    fi
done

# Verificar directorios críticos
echo ""
echo "🔍 Verificando directorios críticos..."
CRITICAL_DIRS=("lib" "components" "pages" "supabase")
for dir in "${CRITICAL_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir/ - OK"
    else
        echo "❌ $dir/ - FALTANTE"
    fi
done

echo ""
echo "🎉 LIMPIEZA COMPLETADA"
echo "====================="
echo "📦 Backup disponible en: $BACKUP_DIR"
echo "🧹 Archivos obsoletos eliminados"
echo "✅ Sistema listo para testing"

echo ""
echo "🚀 PRÓXIMOS PASOS:"
echo "1. Ejecutar: npm install"
echo "2. Ejecutar: npm run dev"
echo "3. Probar el sistema"
echo "4. Si todo funciona, eliminar el backup: rm -rf $BACKUP_DIR"

echo ""
echo "⚠️  Si hay problemas, restaurar desde el backup:"
echo "cp -r $BACKUP_DIR/* ." 