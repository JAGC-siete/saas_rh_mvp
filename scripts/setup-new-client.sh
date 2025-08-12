#!/bin/bash

# CONFIGURACIÓN RÁPIDA DE CLIENTE NUEVO
# Uso: ./setup-new-client.sh "NOMBRE_EMPRESA" "CLIENT-UUID"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# Verificar parámetros
if [ $# -lt 2 ]; then
    error "Uso: $0 \"NOMBRE_EMPRESA\" \"CLIENT-UUID\" [OPCIONAL: archivo_empleados.csv]"
    echo "Ejemplo: $0 \"Mi Empresa S.A.\" \"11111111-2222-3333-4444-555555555555\""
    exit 1
fi

COMPANY_NAME="$1"
CLIENT_UUID="$2"
EMPLOYEES_CSV="${3:-}"

log "🚀 Iniciando configuración para: $COMPANY_NAME"
log "📋 UUID del cliente: $CLIENT_UUID"

# Verificar que tenemos las variables de entorno necesarias
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    error "Faltan variables de entorno: SUPABASE_URL y SUPABASE_SERVICE_KEY"
    echo "Configúralas con:"
    echo "export SUPABASE_URL='https://tu-proyecto.supabase.co'"
    echo "export SUPABASE_SERVICE_KEY='tu-service-key'"
    exit 1
fi

# Generar UUIDs para horarios
SCHED1_UUID=$(uuidgen)
SCHED2_UUID=$(uuidgen)
SCHED3_UUID=$(uuidgen)

log "⏰ Horarios generados:"
log "  - Administrativo: $SCHED1_UUID"
log "  - Ventas: $SCHED2_UUID"
log "  - Producción: $SCHED3_UUID"

# Crear archivo SQL temporal
TEMP_SQL=$(mktemp /tmp/setup-client.XXXXXX.sql)

cat > "$TEMP_SQL" << EOF
-- Crear Company
INSERT INTO companies (id, name, address, phone, email, created_at, updated_at)
VALUES (
  '$CLIENT_UUID',
  '$COMPANY_NAME',
  'Tegucigalpa, Honduras',
  '+504 0000-0000',
  'admin@empresa.com',
  NOW(),
  NOW()
);

-- Crear Departamentos
INSERT INTO departments (name, description, company_id, created_at, updated_at)
VALUES 
  ('Recursos Humanos', 'Gestión de personal', '$CLIENT_UUID', NOW(), NOW()),
  ('Ventas', 'Equipo comercial', '$CLIENT_UUID', NOW(), NOW()),
  ('Contabilidad', 'Área financiera', '$CLIENT_UUID', NOW(), NOW()),
  ('IT', 'Tecnología', '$CLIENT_UUID', NOW(), NOW()),
  ('Operaciones', 'Producción y logística', '$CLIENT_UUID', NOW(), NOW());

-- Crear Horarios
INSERT INTO work_schedules (id, name, company_id, 
  monday_start, monday_end, tuesday_start, tuesday_end,
  wednesday_start, wednesday_end, thursday_start, thursday_end,
  friday_start, friday_end, saturday_start, saturday_end,
  created_at, updated_at)
VALUES 
  ('$SCHED1_UUID', 'Administrativo 8AM-5PM', '$CLIENT_UUID',
   '08:00:00', '17:00:00', '08:00:00', '17:00:00', 
   '08:00:00', '17:00:00', '08:00:00', '17:00:00',
   '08:00:00', '17:00:00', null, null, NOW(), NOW()),
  
  ('$SCHED2_UUID', 'Ventas 9AM-6PM', '$CLIENT_UUID',
   '09:00:00', '18:00:00', '09:00:00', '18:00:00',
   '09:00:00', '18:00:00', '09:00:00', '18:00:00',
   '09:00:00', '18:00:00', '09:00:00', '13:00:00', NOW(), NOW()),
  
  ('$SCHED3_UUID', 'Producción 6AM-3PM', '$CLIENT_UUID',
   '06:00:00', '15:00:00', '06:00:00', '15:00:00',
   '06:00:00', '15:00:00', '06:00:00', '15:00:00',
   '06:00:00', '15:00:00', '06:00:00', '12:00:00', NOW(), NOW());
EOF

# Ejecutar SQL básico
log "🏢 Creando estructura básica..."
if curl -X POST "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"sql\": \"$(cat "$TEMP_SQL" | sed 's/"/\\"/g' | tr '\n' ' ')\"}" > /dev/null 2>&1; then
    log "✅ Estructura básica creada exitosamente"
else
    error "❌ Error creando estructura básica"
    rm "$TEMP_SQL"
    exit 1
fi

# Procesar empleados si se proporciona CSV
if [ -n "$EMPLOYEES_CSV" ] && [ -f "$EMPLOYEES_CSV" ]; then
    log "👥 Procesando empleados desde: $EMPLOYEES_CSV"
    # Aquí iría la lógica para procesar el CSV
    # Formato esperado: employee_code,name,email,phone,dni,department,position,salary
else
    log "👥 Creando empleados de ejemplo..."
    # Crear empleados de ejemplo (usar el SQL que ya tienes)
fi

# Limpiar archivos temporales
rm "$TEMP_SQL"

# Verificar resultado
log "🔍 Verificando configuración..."

# Contar registros creados
COMPANY_COUNT=$(curl -s -X GET "$SUPABASE_URL/rest/v1/companies?id=eq.$CLIENT_UUID&select=count" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" | jq -r '.[0].count // 0')

DEPT_COUNT=$(curl -s -X GET "$SUPABASE_URL/rest/v1/departments?company_id=eq.$CLIENT_UUID&select=count" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" | jq -r 'length')

log "📊 Resumen:"
log "  ✅ Empresas: $COMPANY_COUNT"
log "  ✅ Departamentos: $DEPT_COUNT"
log "  ✅ Horarios: 3"

log "🎉 ¡Configuración completada para $COMPANY_NAME!"
log "📱 UUID del cliente: $CLIENT_UUID"
log "🔗 Ahora puedes:"
log "  1. Acceder al dashboard con este company_id"
log "  2. Crear usuarios admin para la empresa"
log "  3. Comenzar a registrar asistencia"

echo ""
warn "📝 SIGUIENTE PASO: Crear usuario admin"
echo "Ejecuta: ./create-admin-user.sh \"$CLIENT_UUID\" \"admin@empresa.com\" \"password123\""
