#!/bin/bash

# ===============================================================================
# SCRIPT: ACTUALIZAR TODAS LAS APIs QUE USAN requireCompanyAccess
# Ejecutar para corregir el acceso del super admin
# ===============================================================================

echo "🔧 Actualizando APIs para soporte de super admin..."

# Lista de archivos que usan requireCompanyAccess
FILES=(
    "pages/api/attendance/lists.ts"
    "pages/api/gamification.ts"
    "pages/api/payroll/generate-pdf-from-run.ts"
    "pages/api/payroll/authorize.ts"
    "pages/api/payroll/preview.ts"
    "pages/api/reports/index.ts"
    "pages/api/attendance/export.ts"
    "pages/api/attendance/generate-pdf.ts"
    "pages/api/reports/attendance-trends.ts"
    "pages/api/teams.ts"
    "pages/api/attendance/kpis.ts"
    "pages/api/debug/simple-test.ts"
    "pages/api/debug/test-line-insert.ts"
    "pages/api/payroll/edit.ts"
    "pages/api/debug/payroll-run.ts"
    "pages/api/dashboard/executive-stats.ts"
    "pages/api/payroll/calculate.ts"
    "pages/api/payroll/records.ts"
    "pages/api/reports/export-payroll.ts"
    "pages/api/reports/export-employees.ts"
    "pages/api/reports/export-attendance.ts"
    "pages/api/payroll/generate-voucher.ts"
    "pages/api/payroll/export.ts"
    "pages/api/employees/search.ts"
    "pages/api/employees/index.ts"
    "pages/api/user-profiles/index.ts"
    "pages/api/user-profiles/[id].ts"
    "pages/api/reports/dashboard-stats.ts"
    "pages/api/leave/index.ts"
    "pages/api/payroll/receipt.ts"
    "pages/api/payroll/report.ts"
    "pages/api/departments/index.ts"
    "pages/api/departments/[id].ts"
    "pages/api/attendance/employees.ts"
)

# Función para actualizar un archivo
update_file() {
    local file="$1"
    echo "📝 Actualizando: $file"
    
    # Crear backup
    cp "$file" "$file.backup"
    
    # Reemplazar el import
    sed -i '' 's|from.*lib/auth/api-auth.*|from "../../lib/auth/api-auth-fixed"|g' "$file"
    
    echo "✅ Actualizado: $file"
}

# Actualizar todos los archivos
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        update_file "$file"
    else
        echo "⚠️  Archivo no encontrado: $file"
    fi
done

echo ""
echo "🎉 ¡Actualización completada!"
echo ""
echo "📋 RESUMEN:"
echo "- $(echo "${FILES[@]}" | wc -w) archivos procesados"
echo "- Imports actualizados a api-auth-fixed"
echo "- Backups creados (.backup)"
echo ""
echo "🚀 PRÓXIMOS PASOS:"
echo "1. Ejecutar: npm run build"
echo "2. Reiniciar la aplicación"
echo "3. Probar login con super admin"
echo ""
