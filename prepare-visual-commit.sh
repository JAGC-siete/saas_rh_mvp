#!/bin/bash

# Script para preparar commit limpio de mejoras visuales UI
# Excluye archivos de test, debug y SQL

echo "🎨 Preparando commit de mejoras visuales UI..."

# Crear nueva rama temporal para el commit limpio
git checkout -b mejoras-visuales-UI-clean

# Lista de archivos de mejoras visuales a incluir
VISUAL_FILES=(
    "components/ModernDashboard.tsx"
    "components/ModernDashboardLayout.tsx" 
    "components/ModernAttendanceManager.tsx"
    "components/ModernEmployeeManager.tsx"
    "components/ui/button.tsx"
    "components/ui/export-buttons.tsx"
    "components/ui/modern-cards.tsx"
    "components/ui/modern-charts.tsx"
    "pages/_document.tsx"
    "pages/dashboard-modern.tsx"
    "pages/dashboard.tsx"
    "pages/attendance.tsx"
    "pages/employees.tsx"
    "styles/globals.css"
    "tailwind.config.js"
    "package.json"
    "package-lock.json"
    "MEJORAS_VISUALES_UI.md"
)

# Reset para limpiar el staging area
git reset

# Agregar solo los archivos de mejoras visuales
for file in "${VISUAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ Agregando: $file"
        git add "$file"
    else
        echo "⚠️  Archivo no encontrado: $file"
    fi
done

echo ""
echo "📁 Archivos incluidos en el commit:"
git diff --cached --name-only

echo ""
echo "🚫 Archivos de test/debug excluidos:"
echo "   - *.sql (scripts de base de datos)"
echo "   - debug-*.mjs (scripts de debug)"
echo "   - diagnose-*.js (scripts de diagnóstico)" 
echo "   - verify-*.js (scripts de verificación)"
echo "   - query-*.js/sh (scripts de consulta)"
echo "   - pages/api/debug-env.ts (endpoint de debug)"

echo ""
echo "🎯 Listo para commit. Ejecutar:"
echo "   git commit -m 'feat: implementar mejoras visuales UI modernas'"
echo ""
echo "📋 Resumen de cambios:"
echo "   ✨ Diseño oscuro inspirado en Supabase"
echo "   🎯 Sidebar minimalista con iconos Lucide"  
echo "   📊 Componentes modernos (StatsCard, MetricCard)"
echo "   📈 Gráficos con Recharts"
echo "   🚫 Eliminación de emojis y estilo 'AI-generated'"
echo "   🔤 Fuente Inter optimizada"
echo "   📱 Diseño responsive mejorado"
