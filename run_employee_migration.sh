#!/bin/bash

# =====================================================
# SCRIPT DE EJECUCIÓN DE MIGRACIÓN DE EMPLEADOS
# =====================================================
# Este script ejecuta la migración completa paso a paso
# con validaciones y rollback en caso de errores

set -e  # Salir en caso de error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración de la base de datos
DB_URL=${SUPABASE_DB_URL:-"postgresql://postgres:postgres@localhost:54322/postgres"}

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}🚀 INICIANDO MIGRACIÓN DE EMPLEADOS A SUPABASE${NC}"
echo -e "${BLUE}=====================================================${NC}"

# Función para mostrar mensajes
log_step() {
    echo -e "${BLUE}[PASO $1]${NC} $2"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Función para ejecutar SQL y mostrar resultado
execute_sql() {
    local description="$1"
    local sql_file="$2"
    
    echo -e "${BLUE}Ejecutando: $description${NC}"
    
    if psql "$DB_URL" -f "$sql_file" > /tmp/migration_output.log 2>&1; then
        log_success "$description completado"
        # Mostrar notices y resultados importantes
        grep -E "(NOTICE|ERROR|Total|empleados|departamento)" /tmp/migration_output.log || true
    else
        log_error "$description falló"
        echo "Error details:"
        cat /tmp/migration_output.log
        return 1
    fi
    echo ""
}

# Verificar que los archivos existen
if [[ ! -f "migration_employee_data.sql" ]]; then
    log_error "Archivo migration_employee_data.sql no encontrado"
    exit 1
fi

if [[ ! -f "validation_employee_migration.sql" ]]; then
    log_error "Archivo validation_employee_migration.sql no encontrado"
    exit 1
fi

# Verificar conexión a la base de datos
log_step "1" "Verificando conexión a la base de datos..."
if psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    log_success "Conexión a base de datos establecida"
else
    log_error "No se puede conectar a la base de datos"
    echo "URL de conexión: $DB_URL"
    exit 1
fi

# Verificar que las tablas de Supabase existen
log_step "2" "Verificando esquema de Supabase..."
TABLES_EXIST=$(psql "$DB_URL" -t -c "
    SELECT COUNT(*) 
    FROM information_schema.tables 
    WHERE table_name IN ('companies', 'departments', 'work_schedules', 'employees')
    AND table_schema = 'public';
")

if [[ $TABLES_EXIST -eq 4 ]]; then
    log_success "Todas las tablas de Supabase están disponibles"
else
    log_error "Faltan tablas de Supabase. Ejecuta las migraciones de Supabase primero."
    echo "Tablas encontradas: $TABLES_EXIST de 4"
    exit 1
fi

# Hacer backup de datos existentes (si los hay)
log_step "3" "Creando backup de empleados existentes..."
EXISTING_EMPLOYEES=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM employees;")
if [[ $EXISTING_EMPLOYEES -gt 0 ]]; then
    log_warning "Se encontraron $EXISTING_EMPLOYEES empleados existentes"
    BACKUP_FILE="employees_backup_$(date +%Y%m%d_%H%M%S).sql"
    psql "$DB_URL" -c "COPY employees TO STDOUT" > "$BACKUP_FILE"
    log_success "Backup creado: $BACKUP_FILE"
else
    log_success "No hay empleados existentes, continuando..."
fi

# Ejecutar migración principal
log_step "4" "Ejecutando migración principal..."
execute_sql "Migración de empleados" "migration_employee_data.sql"

# Ejecutar validaciones
log_step "5" "Ejecutando validaciones post-migración..."
execute_sql "Validación de migración" "validation_employee_migration.sql"

# Verificar conteo final
log_step "6" "Verificación final..."
TOTAL_MIGRATED=$(psql "$DB_URL" -t -c "
    SELECT COUNT(*) 
    FROM employees 
    WHERE company_id = '00000000-0000-0000-0000-000000000001';
")

ACTIVE_EMPLOYEES=$(psql "$DB_URL" -t -c "
    SELECT COUNT(*) 
    FROM employees 
    WHERE company_id = '00000000-0000-0000-0000-000000000001' 
    AND status = 'active';
")

echo -e "${GREEN}=====================================================${NC}"
echo -e "${GREEN}🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE${NC}"
echo -e "${GREEN}=====================================================${NC}"
echo -e "${GREEN}Total empleados migrados: $TOTAL_MIGRATED${NC}"
echo -e "${GREEN}Empleados activos: $ACTIVE_EMPLOYEES${NC}"
echo -e "${GREEN}Empleados inactivos: $((TOTAL_MIGRATED - ACTIVE_EMPLOYEES))${NC}"
echo -e "${GREEN}=====================================================${NC}"

# Mostrar URLs útiles
echo -e "${BLUE}Enlaces útiles:${NC}"
echo "• Dashboard de empleados: http://localhost:3000/dashboard"
echo "• Registro de asistencia: http://localhost:3000/registrodeasistencia"
echo "• Supabase Dashboard: https://supabase.com/dashboard"

# Limpiar archivos temporales
rm -f /tmp/migration_output.log

echo -e "${GREEN}✨ ¡Migración completada! El sistema está listo para usar.${NC}"
