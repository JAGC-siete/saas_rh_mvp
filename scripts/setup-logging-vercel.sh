#!/bin/bash

# Script para configurar logging centralizado y jobs administrativos en Vercel
# Autor: Sistema HR
# Fecha: 2025-01-27

set -e

echo "🚀 Configurando sistema de logging y jobs administrativos para Vercel..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    log_error "No se encontró package.json. Ejecuta este script desde la raíz del proyecto."
    exit 1
fi

# Paso 1: Instalar dependencias
log_info "Instalando dependencias de logging y jobs..."
npm install winston @types/winston winston-daily-rotate-file axios node-cron @types/node-cron

if [ $? -eq 0 ]; then
    log_success "Dependencias instaladas correctamente"
else
    log_error "Error al instalar dependencias"
    exit 1
fi

# Paso 2: Crear directorio de logs
log_info "Creando directorio de logs..."
mkdir -p logs
touch logs/.gitkeep

# Paso 3: Verificar configuración de Vercel
log_info "Verificando configuración de Vercel..."

if [ ! -f "vercel.json" ]; then
    log_warning "vercel.json no encontrado. Creando configuración básica..."
    cat > vercel.json << EOF
{
  "functions": {
    "pages/api/admin/jobs.ts": {
      "maxDuration": 60
    },
    "pages/api/admin/logs.ts": {
      "maxDuration": 30
    },
    "pages/api/cron/*.ts": {
      "maxDuration": 60
    }
  },
  "crons": [
    {
      "path": "/api/cron/cleanup-old-logs",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/backup-critical-data",
      "schedule": "0 3 * * 0"
    },
    {
      "path": "/api/cron/verify-data-integrity",
      "schedule": "0 4 * * *"
    },
    {
      "path": "/api/cron/generate-automatic-reports",
      "schedule": "0 6 * * 1"
    },
    {
      "path": "/api/cron/cleanup-expired-sessions",
      "schedule": "0 1 * * *"
    }
  ]
}
EOF
    log_success "vercel.json creado"
else
    log_success "vercel.json ya existe"
fi

# Paso 4: Verificar variables de entorno
log_info "Verificando variables de entorno..."

ENV_FILE=".env.local"
if [ ! -f "$ENV_FILE" ]; then
    log_warning "Archivo .env.local no encontrado. Creando plantilla..."
    cat > "$ENV_FILE" << EOF
# Logging Configuration
LOG_LEVEL=info
CRON_SECRET=your-secret-cron-key-here

# Vercel Configuration
VERCEL=true

# Supabase Configuration (ya deberían existir)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
EOF
    log_warning "Por favor, actualiza las variables en $ENV_FILE"
else
    log_success "Archivo .env.local encontrado"
fi

# Paso 5: Verificar estructura de directorios
log_info "Verificando estructura de directorios..."

# Crear directorios si no existen
mkdir -p pages/api/admin
mkdir -p pages/api/cron
mkdir -p lib

# Paso 6: Verificar archivos críticos
log_info "Verificando archivos críticos..."

CRITICAL_FILES=(
    "lib/logger.ts"
    "lib/jobs.ts"
    "pages/api/admin/jobs.ts"
    "pages/api/admin/logs.ts"
    "pages/api/cron/cleanup-old-logs.ts"
    "pages/api/cron/backup-critical-data.ts"
    "supabase/migrations/20250723000004_logging_and_jobs_system.sql"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        log_success "✓ $file"
    else
        log_error "✗ $file - NO ENCONTRADO"
    fi
done

# Paso 7: Configurar .gitignore
log_info "Actualizando .gitignore..."

if [ -f ".gitignore" ]; then
    # Verificar si ya existe la entrada de logs
    if ! grep -q "logs/" .gitignore; then
        echo "" >> .gitignore
        echo "# Logs" >> .gitignore
        echo "logs/*.log" >> .gitignore
        echo "logs/*.json" >> .gitignore
        echo "!logs/.gitkeep" >> .gitignore
        log_success "Entradas de logs agregadas a .gitignore"
    else
        log_success "Entradas de logs ya existen en .gitignore"
    fi
else
    log_warning ".gitignore no encontrado"
fi

# Paso 8: Verificar configuración de Supabase
log_info "Verificando configuración de Supabase..."

if [ -d "supabase" ]; then
    log_success "Directorio supabase encontrado"
    
    # Verificar si la migración existe
    if [ -f "supabase/migrations/20250723000004_logging_and_jobs_system.sql" ]; then
        log_success "Migración de logging encontrada"
    else
        log_warning "Migración de logging no encontrada. Debes ejecutarla manualmente."
    fi
else
    log_warning "Directorio supabase no encontrado"
fi

# Paso 9: Crear script de prueba
log_info "Creando script de prueba..."

cat > scripts/test-logging.js << 'EOF'
const logger = require('../lib/logger');

console.log('🧪 Probando sistema de logging...');

logger.info('Test de logging - INFO', { test: true, timestamp: new Date().toISOString() });
logger.warn('Test de logging - WARNING', { test: true, timestamp: new Date().toISOString() });
logger.error('Test de logging - ERROR', { test: true, timestamp: new Date().toISOString() });

console.log('✅ Prueba de logging completada. Revisa los logs en la consola o archivos.');
EOF

chmod +x scripts/test-logging.js

# Paso 10: Crear script de verificación de jobs
log_info "Creando script de verificación de jobs..."

cat > scripts/test-jobs.js << 'EOF'
const { jobManager } = require('../lib/jobs');

async function testJobs() {
    console.log('🧪 Probando sistema de jobs...');
    
    try {
        // Listar jobs disponibles
        const jobs = Array.from(jobManager['jobs'].keys());
        console.log('Jobs disponibles:', jobs);
        
        // Probar un job simple
        console.log('Ejecutando job de limpieza de logs...');
        const result = await jobManager.executeJob('cleanup-old-logs');
        
        console.log('Resultado:', result);
        console.log('✅ Prueba de jobs completada.');
        
    } catch (error) {
        console.error('❌ Error en prueba de jobs:', error);
    }
}

testJobs();
EOF

chmod +x scripts/test-jobs.js

# Paso 11: Resumen final
echo ""
echo "🎉 Configuración completada!"
echo ""
echo "📋 Resumen de lo que se configuró:"
echo "  ✓ Dependencias instaladas (winston, axios, node-cron)"
echo "  ✓ Directorio de logs creado"
echo "  ✓ Configuración de Vercel (vercel.json)"
echo "  ✓ Variables de entorno (plantilla .env.local)"
echo "  ✓ Estructura de directorios"
echo "  ✓ Scripts de prueba creados"
echo ""
echo "🔧 Próximos pasos:"
echo "  1. Actualiza las variables en .env.local"
echo "  2. Ejecuta la migración de Supabase:"
echo "     supabase db push"
echo "  3. Prueba el sistema:"
echo "     npm run logs:dev"
echo "     node scripts/test-logging.js"
echo "     node scripts/test-jobs.js"
echo "  4. Despliega a Vercel:"
echo "     vercel --prod"
echo ""
echo "📚 Documentación:"
echo "  - Logs: lib/logger.ts"
echo "  - Jobs: lib/jobs.ts"
echo "  - APIs: pages/api/admin/"
echo "  - Cron: pages/api/cron/"
echo ""

log_success "¡Configuración completada exitosamente!" 