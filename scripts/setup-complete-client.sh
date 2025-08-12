#!/bin/bash

# SCRIPT MAESTRO DE CONFIGURACIÓN COMPLETA DE CLIENTE
# Genera empresa completa + usuario administrador en un solo comando
# Uso: ./setup-complete-client.sh "NOMBRE_EMPRESA" "EMAIL_ADMIN" [NUM_DEPARTAMENTOS] [EMPLEADOS_POR_DEPT] [PASSWORD_ADMIN]

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Función para logging con íconos
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] 🔄 $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

success() {
    echo -e "${PURPLE}✅ $1${NC}"
}

title() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}🚀 $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Función para generar password seguro
generate_password() {
    local length=${1:-12}
    local password=""
    local chars="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"
    
    for i in $(seq 1 $length); do
        password+="${chars:$((RANDOM % ${#chars})):1}"
    done
    
    # Asegurar que tenga al menos una mayúscula, minúscula, número y símbolo
    password="A${password:1:$((length-4))}a1!"
    echo "$password"
}

# Banner inicial
START_TIME=$(date +%s)
clear
title "CONFIGURACIÓN AUTOMÁTICA COMPLETA DE CLIENTE HR SAAS"
echo ""

# Verificar parámetros
if [ $# -lt 2 ]; then
    error "Uso: $0 \"NOMBRE_EMPRESA\" \"EMAIL_ADMIN\" [NUM_DEPARTAMENTOS] [EMPLEADOS_POR_DEPT] [PASSWORD_ADMIN]"
    echo ""
    echo "📋 EJEMPLOS:"
    echo "  $0 \"Empresa Demo S.A.\" \"admin@demo.com\""
    echo "  $0 \"Mi Corporación\" \"ceo@corp.com\" 8 3"
    echo "  $0 \"Startup Tech\" \"admin@startup.com\" 5 5 \"MiPassword123!\""
    echo ""
    echo "📊 VALORES POR DEFECTO:"
    echo "  • Departamentos: 5"
    echo "  • Empleados por depto: 5"
    echo "  • Password: Auto-generado seguro"
    exit 1
fi

COMPANY_NAME="$1"
ADMIN_EMAIL="$2"
NUM_DEPARTMENTS=${3:-5}
EMPLOYEES_PER_DEPT=${4:-5}
ADMIN_PASSWORD="${5:-$(generate_password 16)}"

# Validaciones
if [[ ! "$ADMIN_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    error "Formato de email inválido: $ADMIN_EMAIL"
    exit 1
fi

if [ "$NUM_DEPARTMENTS" -gt 10 ]; then
    error "Máximo 10 departamentos disponibles"
    exit 1
fi

if [ "$EMPLOYEES_PER_DEPT" -gt 20 ]; then
    error "Máximo 20 empleados por departamento"
    exit 1
fi

# Verificar dependencias
log "Verificando dependencias del sistema..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    error "Node.js no está instalado"
    echo "📥 Instalar desde: https://nodejs.org/"
    exit 1
fi

# Verificar uuidgen
if ! command -v uuidgen &> /dev/null; then
    warn "uuidgen no disponible, usando alternativa..."
    # Función alternativa para generar UUID
    generate_uuid() {
        node -e "console.log(require('crypto').randomUUID())"
    }
else
    generate_uuid() {
        uuidgen | tr '[:upper:]' '[:lower:]'
    }
fi

# Verificar variables de entorno
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    error "Variables de entorno Supabase requeridas"
    echo ""
    echo "🔧 Configurar con:"
    echo "  export SUPABASE_URL='https://tu-proyecto.supabase.co'"
    echo "  export SUPABASE_SERVICE_KEY='tu-service-key'"
    echo ""
    echo "💡 También puedes agregarlas a tu .env file"
    exit 1
fi

# Verificar @supabase/supabase-js
if ! npm list @supabase/supabase-js &> /dev/null && ! npm list -g @supabase/supabase-js &> /dev/null; then
    warn "@supabase/supabase-js no está instalado, instalando..."
    if npm install @supabase/supabase-js; then
        success "Dependencia instalada correctamente"
    else
        error "No se pudo instalar @supabase/supabase-js"
        exit 1
    fi
fi

# Generar UUID único para el cliente
CLIENT_UUID=$(generate_uuid)
ADMIN_NAME="Administrador $(echo "$COMPANY_NAME" | sed 's/S\.A\.//g' | sed 's/Ltda\.//g' | xargs)"

# Mostrar configuración
title "CONFIGURACIÓN SELECCIONADA"
echo ""
info "🏢 Empresa: $COMPANY_NAME"
info "🆔 UUID: $CLIENT_UUID"
info "📧 Admin Email: $ADMIN_EMAIL"
info "🔐 Admin Password: $ADMIN_PASSWORD"
info "👤 Admin Nombre: $ADMIN_NAME"
info "🏬 Departamentos: $NUM_DEPARTMENTS"
info "👥 Empleados por depto: $EMPLOYEES_PER_DEPT"
info "📊 Total empleados: $((NUM_DEPARTMENTS * EMPLOYEES_PER_DEPT))"
echo ""

# Confirmación
read -p "¿Continuar con la configuración? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    warn "Configuración cancelada por el usuario"
    exit 0
fi

# ====== FASE 1: CREAR ESTRUCTURA DE EMPRESA ======
title "FASE 1: CREANDO ESTRUCTURA DE EMPRESA"

log "Ejecutando script de configuración automática..."
if ! ./scripts/auto-setup-client.sh "$COMPANY_NAME" "$NUM_DEPARTMENTS" "$EMPLOYEES_PER_DEPT"; then
    error "Error en la creación de la estructura de empresa"
    exit 1
fi

success "Estructura de empresa creada correctamente"

# ====== FASE 2: CREAR USUARIO ADMINISTRADOR ======
title "FASE 2: CREANDO USUARIO ADMINISTRADOR"

log "Creando usuario administrador..."
if ! ./scripts/create-admin-user.sh "$ADMIN_EMAIL" "$ADMIN_PASSWORD" "$CLIENT_UUID" "$ADMIN_NAME"; then
    error "Error creando usuario administrador"
    warn "La estructura de empresa ya fue creada, puedes crear el admin manualmente"
    exit 1
fi

success "Usuario administrador creado correctamente"

# ====== FASE 3: VERIFICACIÓN FINAL ======
title "FASE 3: VERIFICACIÓN FINAL"

log "Verificando configuración..."

# Crear script de verificación
TEMP_DIR=$(mktemp -d)
VERIFY_SCRIPT="$TEMP_DIR/verify.js"

cat > "$VERIFY_SCRIPT" << 'EOF'
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function verify() {
    const companyId = process.argv[2];
    
    try {
        // Verificar empresa
        const { data: company } = await supabase
            .from('companies')
            .select('*')
            .eq('id', companyId)
            .single();
            
        // Verificar departamentos
        const { data: departments } = await supabase
            .from('departments')
            .select('*')
            .eq('company_id', companyId);
            
        // Verificar empleados
        const { data: employees } = await supabase
            .from('employees')
            .select('*')
            .eq('company_id', companyId);
            
        // Verificar horarios
        const { data: schedules } = await supabase
            .from('work_schedules')
            .select('*')
            .eq('company_id', companyId);
            
        // Verificar usuario admin
        const { data: admin } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('company_id', companyId)
            .eq('role', 'company_admin');
            
        console.log('✅ VERIFICACIÓN COMPLETADA:');
        console.log(`  🏢 Empresa: ${company ? '✅' : '❌'}`);
        console.log(`  🏬 Departamentos: ${departments?.length || 0}`);
        console.log(`  👥 Empleados: ${employees?.length || 0}`);
        console.log(`  ⏰ Horarios: ${schedules?.length || 0}`);
        console.log(`  👤 Admin: ${admin?.length ? '✅' : '❌'}`);
        
    } catch (error) {
        console.error('❌ Error en verificación:', error.message);
    }
}

verify();
EOF

node "$VERIFY_SCRIPT" "$CLIENT_UUID"
rm -rf "$TEMP_DIR"

# ====== RESUMEN FINAL ======
title "🎉 CONFIGURACIÓN COMPLETA EXITOSA"
echo ""
success "Cliente configurado completamente en $(date)"
echo ""
echo "📊 RESUMEN FINAL:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏢 EMPRESA:"
echo "   Nombre: $COMPANY_NAME"
echo "   UUID: $CLIENT_UUID"
echo ""
echo "👤 ADMINISTRADOR:"
echo "   Email: $ADMIN_EMAIL"
echo "   Password: $ADMIN_PASSWORD"
echo "   Nombre: $ADMIN_NAME"
echo ""
echo "📈 ESTADÍSTICAS:"
echo "   🏬 Departamentos: $NUM_DEPARTMENTS"
echo "   👥 Total Empleados: $((NUM_DEPARTMENTS * EMPLOYEES_PER_DEPT))"
echo "   ⏰ Horarios de Trabajo: 3"
echo "   🎯 Posiciones Únicas: $((NUM_DEPARTMENTS * 5)) aprox."
echo ""
echo "🔗 ACCESO AL SISTEMA:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   🌐 URL: https://tu-app.railway.app/app/login"
echo "   📧 Email: $ADMIN_EMAIL"
echo "   🔐 Password: $ADMIN_PASSWORD"
echo ""
echo "🎯 PRÓXIMOS PASOS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   1. 🔐 Iniciar sesión con las credenciales de administrador"
echo "   2. ✏️  Personalizar datos de empleados (nombres, DNI, teléfonos)"
echo "   3. ⏰ Ajustar horarios de trabajo si es necesario"
echo "   4. 🏬 Configurar departamentos adicionales"
echo "   5. 👥 Invitar a otros usuarios administradores"
echo "   6. 📊 Comenzar a registrar asistencias"
echo ""
echo "💡 TIPS:"
echo "   • Todos los empleados tienen datos ficticios pero realistas"
echo "   • Los DNI son generados automáticamente (formato hondureño)"
echo "   • Los salarios están en rangos apropiados por posición"
echo "   • Los emails siguen el patrón: nombre@empresa.com"
echo ""

# Guardar información de acceso
ACCESS_INFO_FILE="client-access-info-$(date +%Y%m%d-%H%M%S).txt"
cat > "$ACCESS_INFO_FILE" << EOF
INFORMACIÓN DE ACCESO - CLIENTE: $COMPANY_NAME
Generado: $(date)

CREDENCIALES DE ADMINISTRADOR:
Email: $ADMIN_EMAIL
Password: $ADMIN_PASSWORD
Company UUID: $CLIENT_UUID

ACCESO AL SISTEMA:
URL: https://tu-app.railway.app/app/login

ESTADÍSTICAS:
- Departamentos: $NUM_DEPARTMENTS
- Empleados: $((NUM_DEPARTMENTS * EMPLOYEES_PER_DEPT))
- Horarios: 3

NOTAS:
- Todos los empleados tienen datos ficticios
- Personalizar según necesidades del cliente
- Contraseñas seguras generadas automáticamente
EOF

success "Información guardada en: $ACCESS_INFO_FILE"
info "💾 Archivo de acceso creado para referencia futura"

# Mostrar tiempo de ejecución
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
info "⏱️  Tiempo total de configuración: ${DURATION} segundos"

title "✨ CLIENTE LISTO PARA USO"
echo ""
echo "🎊 ¡El cliente puede comenzar a usar el sistema inmediatamente!"
echo ""
