#!/bin/bash

# Ejemplo de uso del sistema de auditoría HR SaaS
# Este script demuestra diferentes formas de ejecutar las auditorías

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${PURPLE}$1${NC}"
}

print_info() {
    echo -e "${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}$1${NC}"
}

print_header "🔍 HR SaaS Audit System - Ejemplos de Uso"
echo "=================================================="

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Este script debe ejecutarse desde la raíz del proyecto"
    exit 1
fi

print_info "📁 Directorio actual: $(pwd)"
print_info "📦 Proyecto detectado: HR SaaS Frontend"

echo ""
print_header "🎯 Escenarios de Auditoría"
echo "=================================================="

# Escenario 1: Auditoría completa (recomendado para producción)
echo ""
print_header "1. Auditoría Completa (Recomendado)"
print_info "Ejecuta todas las verificaciones y genera reporte consolidado"
echo "Comando: npm run audit"
echo "O: ./scripts/run-complete-audit.sh"
echo ""

# Escenario 2: Auditoría rápida del sistema
echo ""
print_header "2. Auditoría Rápida del Sistema"
print_info "Solo verifica la arquitectura del sistema (sin base de datos)"
echo "Comando: npm run audit:quick"
echo "O: node scripts/audit-system.js"
echo ""

# Escenario 3: Auditoría específica del sistema
echo ""
print_header "3. Auditoría Específica del Sistema"
print_info "Verifica estructura, APIs, rutas, configuración"
echo "Comando: npm run audit:system"
echo "O: node scripts/audit-system.js"
echo ""

# Escenario 4: Auditoría específica de Supabase
echo ""
print_header "4. Auditoría Específica de Supabase"
print_info "Verifica conectividad, RLS, multi-tenant, integridad"
echo "Comando: npm run audit:supabase"
print_warning "⚠️  Requiere variables de entorno configuradas"
echo "O: node scripts/audit-supabase.js"
echo ""

# Escenario 5: Integración con CI/CD
echo ""
print_header "5. Integración con CI/CD"
print_info "Ejemplo para GitHub Actions o similar"
echo "```yaml"
echo "- name: Run System Audit"
echo "  run: |"
echo "    npm install"
echo "    npm run audit"
echo "```"
echo ""

# Escenario 6: Pre-commit hook
echo ""
print_header "6. Pre-commit Hook"
print_info "Ejecutar antes de cada commit"
echo "```bash"
echo "# En .git/hooks/pre-commit"
echo "#!/bin/bash"
echo "npm run audit:system"
echo "```"
echo ""

# Escenario 7: Verificación de desarrollo
echo ""
print_header "7. Verificación de Desarrollo"
print_info "Para verificar cambios durante desarrollo"
echo "```bash"
echo "# Verificar solo cambios de sistema"
echo "npm run audit:system"
echo ""
echo "# Verificar solo base de datos"
echo "npm run audit:supabase"
echo "```"
echo ""

print_header "📊 Interpretación de Resultados"
echo "=================================================="

echo "✅ PASSED: Verificación exitosa"
echo "❌ FAILED: Error crítico - debe corregirse"
echo "⚠️  WARNING: Problema menor - debe revisarse"
echo "ℹ️  INFO: Información adicional"
echo ""

print_header "📁 Archivos de Salida"
echo "=================================================="

echo "Los reportes se guardan en:"
echo "- audit-reports/system-audit-report.json"
echo "- audit-reports/supabase-audit-report.json"
echo "- audit-reports/consolidated-audit-report.md"
echo ""

print_header "🔧 Configuración Requerida"
echo "=================================================="

echo "Variables de entorno necesarias (.env.local):"
echo "- NEXT_PUBLIC_SUPABASE_URL"
echo "- NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "- SUPABASE_SERVICE_ROLE_KEY"
echo ""

print_header "🚀 Ejecutar Auditoría Ahora"
echo "=================================================="

echo "¿Deseas ejecutar una auditoría ahora?"
echo "1. Auditoría completa (recomendado)"
echo "2. Solo auditoría del sistema"
echo "3. Solo auditoría de Supabase"
echo "4. Salir"
echo ""

read -p "Selecciona una opción (1-4): " choice

case $choice in
    1)
        print_info "🚀 Ejecutando auditoría completa..."
        npm run audit
        ;;
    2)
        print_info "🚀 Ejecutando auditoría del sistema..."
        npm run audit:system
        ;;
    3)
        print_info "🚀 Ejecutando auditoría de Supabase..."
        print_warning "⚠️  Asegúrate de tener las variables de entorno configuradas"
        npm run audit:supabase
        ;;
    4)
        print_info "👋 ¡Hasta luego!"
        exit 0
        ;;
    *)
        print_warning "❌ Opción inválida"
        exit 1
        ;;
esac

print_success "✅ Ejemplo completado. Revisa los reportes generados." 