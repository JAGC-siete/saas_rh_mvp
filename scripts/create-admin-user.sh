#!/bin/bash

# SCRIPT PARA CREAR USUARIO ADMINISTRADOR AUTOMÁTICAMENTE
# Uso: ./create-admin-user.sh "EMAIL" "PASSWORD" "COMPANY_UUID" ["NOMBRE_COMPLETO"]

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

success() {
    echo -e "${BLUE}[SUCCESS] $1${NC}"
}

# Verificar parámetros
if [ $# -lt 3 ]; then
    error "Uso: $0 \"EMAIL\" \"PASSWORD\" \"COMPANY_UUID\" [\"NOMBRE_COMPLETO\"]"
    echo ""
    echo "Ejemplos:"
    echo "  $0 \"admin@empresa.com\" \"Admin123!\" \"550e8400-e29b-41d4-a716-446655440000\""
    echo "  $0 \"ceo@startup.com\" \"Secure2024!\" \"uuid-here\" \"Juan Pérez\""
    exit 1
fi

ADMIN_EMAIL="$1"
ADMIN_PASSWORD="$2"
COMPANY_UUID="$3"
ADMIN_NAME="${4:-Administrador General}"

# Validar formato de email básico
if [[ ! "$ADMIN_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    error "Formato de email inválido: $ADMIN_EMAIL"
    exit 1
fi

# Validar UUID format
if [[ ! "$COMPANY_UUID" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
    error "Formato de UUID inválido: $COMPANY_UUID"
    exit 1
fi

log "🔐 Creando usuario administrador..."
log "📧 Email: $ADMIN_EMAIL"
log "🏢 Company UUID: $COMPANY_UUID"
log "👤 Nombre: $ADMIN_NAME"

# Crear archivo temporal de Node.js
TEMP_DIR=$(mktemp -d)
NODE_SCRIPT="$TEMP_DIR/create_admin.js"

cat > "$NODE_SCRIPT" << 'EOF'
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variables de entorno SUPABASE_URL y SUPABASE_SERVICE_KEY requeridas');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdminUser() {
    const [email, password, companyUuid, adminName] = process.argv.slice(2);
    
    try {
        console.log('🔄 Verificando si la empresa existe...');
        
        // Verificar que la empresa existe
        const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('id, name')
            .eq('id', companyUuid)
            .single();
            
        if (companyError || !company) {
            console.error('❌ Empresa no encontrada:', companyError?.message || 'UUID inválido');
            return;
        }
        
        console.log('✅ Empresa encontrada:', company.name);
        console.log('🔄 Creando usuario en Supabase Auth...');
        
        // Crear usuario en Supabase Auth
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
                role: 'company_admin',
                company_id: companyUuid,
                full_name: adminName
            }
        });
        
        if (authError) {
            console.error('❌ Error creando usuario auth:', authError.message);
            return;
        }
        
        console.log('✅ Usuario auth creado:', authUser.user.id);
        console.log('🔄 Creando perfil de usuario...');
        
        // Crear perfil en user_profiles
        const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
                id: authUser.user.id,
                email: email,
                full_name: adminName,
                role: 'company_admin',
                company_id: companyUuid,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
            
        if (profileError) {
            console.error('❌ Error creando perfil:', profileError.message);
            
            // Intentar eliminar el usuario auth si falló el perfil
            await supabase.auth.admin.deleteUser(authUser.user.id);
            console.log('🔄 Usuario auth eliminado debido al error');
            return;
        }
        
        console.log('✅ Perfil de usuario creado exitosamente');
        console.log('');
        console.log('🎉 ¡USUARIO ADMINISTRADOR CREADO!');
        console.log('');
        console.log('📊 DETALLES:');
        console.log(`  📧 Email: ${email}`);
        console.log(`  🔑 Password: ${password}`);
        console.log(`  👤 Nombre: ${adminName}`);
        console.log(`  🏢 Empresa: ${company.name}`);
        console.log(`  🆔 User ID: ${authUser.user.id}`);
        console.log(`  🏢 Company ID: ${companyUuid}`);
        console.log('');
        console.log('🔗 ACCESO:');
        console.log('  URL: https://tu-app.railway.app/app/login');
        console.log(`  Email: ${email}`);
        console.log(`  Password: ${password}`);
        
    } catch (error) {
        console.error('❌ Error inesperado:', error.message);
    }
}

createAdminUser();
EOF

# Verificar dependencias
if ! command -v node &> /dev/null; then
    error "Node.js no está instalado"
    exit 1
fi

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    error "Variables de entorno SUPABASE_URL y SUPABASE_SERVICE_KEY requeridas"
    echo ""
    echo "Configurar con:"
    echo "  export SUPABASE_URL='https://tu-proyecto.supabase.co'"
    echo "  export SUPABASE_SERVICE_KEY='tu-service-key'"
    exit 1
fi

# Verificar si @supabase/supabase-js está disponible
if ! npm list @supabase/supabase-js &> /dev/null && ! npm list -g @supabase/supabase-js &> /dev/null; then
    error "@supabase/supabase-js no está instalado"
    echo ""
    echo "Instalar con:"
    echo "  npm install @supabase/supabase-js"
    echo "  # o globalmente:"
    echo "  npm install -g @supabase/supabase-js"
    exit 1
fi

# Ejecutar el script
log "🚀 Ejecutando creación de usuario..."
node "$NODE_SCRIPT" "$ADMIN_EMAIL" "$ADMIN_PASSWORD" "$COMPANY_UUID" "$ADMIN_NAME"

# Limpiar archivos temporales
rm -rf "$TEMP_DIR"

log "✨ Script completado"
