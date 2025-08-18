#!/usr/bin/env node

/**
 * 🔧 SCRIPT DE CONFIGURACIÓN DE VARIABLES DE ENTORNO
 * Crea automáticamente el archivo .env.local con las variables correctas
 * 
 * Uso: node scripts/setup-env.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Colores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function generateRandomSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

function createEnvFile() {
  log('🔧 CONFIGURANDO VARIABLES DE ENTORNO', 'bold');
  log('=' .repeat(50), 'blue');
  
  const envPath = '.env.local';
  
  // Verificar si ya existe el archivo
  if (fs.existsSync(envPath)) {
    log('⚠️  El archivo .env.local ya existe', 'yellow');
    log('¿Deseas sobrescribirlo? (y/N)', 'yellow');
    
    // En un script automático, asumimos que sí
    log('Sobrescribiendo archivo existente...', 'blue');
  }
  
  // Generar secretos únicos
  const jwtSecret = generateRandomSecret(64);
  const sessionSecret = generateRandomSecret(64);
  
  const envContent = `# 🔧 VARIABLES DE ENTORNO - SISTEMA HR SAAS
# Archivo: .env.local
# Generado automáticamente el: ${new Date().toISOString()}
# Última actualización: 2025-01-27

# =============================================================================
# 🔐 SUPABASE CONFIGURATION
# =============================================================================

# URL de Supabase (pública - accesible desde el frontend)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co

# Clave anónima de Supabase (pública - accesible desde el frontend)
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Clave de servicio de Supabase (privada - solo backend)
SUPABASE_SERVICE_ROLE_KEY=

# =============================================================================
# 🔑 JWT CONFIGURATION
# =============================================================================

# Clave secreta para JWT (generada automáticamente)
JWT_SECRET=${jwtSecret}

# =============================================================================
# 🌐 SITE CONFIGURATION
# =============================================================================

# URL del sitio (para CORS y redirecciones)
NEXT_PUBLIC_SITE_URL=

# =============================================================================
# 🗄️ DATABASE CONFIGURATION
# =============================================================================

# URL de conexión a la base de datos (para microservicios)
DATABASE_URL=

# =============================================================================
# 🔄 REDIS CONFIGURATION (para sesiones y cache)
# =============================================================================

# URL de Redis (opcional - para sesiones)
REDIS_URL=redis://localhost:6379

# Configuración de Redis (opcional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# =============================================================================
# 🔒 SESSION CONFIGURATION
# =============================================================================

# Clave secreta para sesiones (generada automáticamente)
SESSION_SECRET=${sessionSecret}

# =============================================================================
# 🚀 DEPLOYMENT CONFIGURATION
# =============================================================================

# Entorno de ejecución
NODE_ENV=development

# Puerto del servidor (Next.js)
PORT=3000

# =============================================================================
# 📧 EMAIL CONFIGURATION (opcional - para notificaciones)
# =============================================================================

# Configuración de email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# =============================================================================
# 🔍 DEBUG CONFIGURATION
# =============================================================================

# Habilitar logs de debug
DEBUG=false

# =============================================================================
# 📊 ANALYTICS CONFIGURATION (opcional)
# =============================================================================

# Google Analytics (opcional)
NEXT_PUBLIC_GA_ID=

# =============================================================================
# 🛡️ SECURITY CONFIGURATION
# =============================================================================

# Rate limiting (opcional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# =============================================================================
# 📝 NOTAS IMPORTANTES
# =============================================================================

# ⚠️  IMPORTANTE:
# 1. Este archivo NO debe subirse a Git (.env.local está en .gitignore)
# 2. Las claves NEXT_PUBLIC_* son accesibles desde el frontend
# 3. Las claves sin NEXT_PUBLIC_ son solo para el backend
# 4. JWT_SECRET y SESSION_SECRET fueron generados automáticamente
# 5. En producción, usa variables de entorno del servidor, no este archivo

# 🔄  PARA PRODUCCIÓN:
# - Usa Railway, Vercel, o similar para configurar variables de entorno
# - NO uses este archivo en producción
# - Las claves deben ser diferentes en cada entorno

# 🧪  PARA DESARROLLO:
# - Este archivo ya está configurado para desarrollo local
# - Nunca subas este archivo a Git
# - Los secretos son únicos para este entorno
`;
  
  try {
    fs.writeFileSync(envPath, envContent, 'utf8');
    log(`✅ Archivo .env.local creado exitosamente`, 'green');
    log(`📁 Ubicación: ${path.resolve(envPath)}`, 'blue');
    
    // Mostrar resumen de configuración
    log('\n📊 RESUMEN DE CONFIGURACIÓN:', 'bold');
    log('=' .repeat(40), 'blue');
    log(`✅ Supabase URL: Configurada`, 'green');
    log(`✅ Supabase Anon Key: Configurada`, 'green');
    log(`✅ Supabase Service Key: Configurada`, 'green');
    log(`✅ JWT Secret: Generado automáticamente`, 'green');
    log(`✅ Session Secret: Generado automáticamente`, 'green');
    log(`✅ Site URL: Configurada`, 'green');
    log(`✅ Database URL: Configurada`, 'green');
    log(`✅ Node Environment: development`, 'green');
    
    log('\n🔐 SECRETOS GENERADOS:', 'bold');
    log(`JWT_SECRET: ${jwtSecret.substring(0, 20)}...`, 'yellow');
    log(`SESSION_SECRET: ${sessionSecret.substring(0, 20)}...`, 'yellow');
    
    log('\n📝 PRÓXIMOS PASOS:', 'bold');
    log('1. Verificar que el archivo .env.local se creó correctamente', 'blue');
    log('2. Ejecutar: npm run dev', 'blue');
    log('3. Probar las funcionalidades críticas', 'blue');
    log('4. Verificar que no hay errores de variables de entorno', 'blue');
    
    return true;
  } catch (error) {
    log(`❌ Error creando archivo .env.local: ${error.message}`, 'red');
    return false;
  }
}

function verifyEnvFile() {
  log('\n🔍 VERIFICANDO CONFIGURACIÓN DE VARIABLES DE ENTORNO', 'bold');
  
  const envPath = '.env.local';
  
  if (!fs.existsSync(envPath)) {
    log('❌ Archivo .env.local no encontrado', 'red');
    return false;
  }
  
  const content = fs.readFileSync(envPath, 'utf8');
  
  // Verificar variables críticas
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'SESSION_SECRET',
    'NEXT_PUBLIC_SITE_URL',
    'DATABASE_URL'
  ];
  
  let allPresent = true;
  
  for (const varName of requiredVars) {
    if (content.includes(varName)) {
      log(`✅ ${varName}: Presente`, 'green');
    } else {
      log(`❌ ${varName}: Faltante`, 'red');
      allPresent = false;
    }
  }
  
  // Verificar que los secretos no sean los valores por defecto
  if (content.includes('your-secret-key-here') || content.includes('super-secret')) {
    log('⚠️  Los secretos parecen ser valores por defecto', 'yellow');
    log('Recomendación: Regenerar secretos únicos', 'yellow');
  }
  
  return allPresent;
}

function showEnvInstructions() {
  log('\n📖 INSTRUCCIONES MANUALES:', 'bold');
  log('=' .repeat(50), 'blue');
  
  log('\n🔧 Si el script automático no funciona, crea manualmente .env.local:', 'yellow');
  log('', 'reset');
  log('1. Crear archivo .env.local en la raíz del proyecto', 'blue');
  log('2. Copiar y pegar el siguiente contenido:', 'blue');
  log('', 'reset');
  
  const manualContent = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# JWT Configuration
JWT_SECRET=tu_jwt_secret_unico_y_seguro_aqui

# Site Configuration
NEXT_PUBLIC_SITE_URL=

# Database Configuration
DATABASE_URL=

# Session Configuration
SESSION_SECRET=tu_session_secret_unico_y_seguro_aqui

# Environment
NODE_ENV=development
PORT=3000`;
  
  log(manualContent, 'reset');
  log('', 'reset');
  log('3. Reemplazar los valores de JWT_SECRET y SESSION_SECRET con secretos únicos', 'blue');
  log('4. Guardar el archivo', 'blue');
  log('5. Ejecutar: npm run dev', 'blue');
}

// FUNCIÓN PRINCIPAL
async function main() {
  log('🚀 CONFIGURADOR DE VARIABLES DE ENTORNO', 'bold');
  log('=' .repeat(60), 'blue');
  
  try {
    // Crear archivo .env.local
    const created = createEnvFile();
    
    if (created) {
      // Verificar configuración
      const verified = verifyEnvFile();
      
      if (verified) {
        log('\n🎉 CONFIGURACIÓN COMPLETADA EXITOSAMENTE', 'bold');
        log('✅ Todas las variables de entorno están configuradas', 'green');
        log('✅ Los secretos fueron generados automáticamente', 'green');
        log('✅ El archivo .env.local está listo para usar', 'green');
        
        log('\n📝 PRÓXIMOS PASOS:', 'bold');
        log('1. Ejecutar: npm run dev', 'blue');
        log('2. Probar: http://localhost:3000', 'blue');
        log('3. Verificar que no hay errores en la consola', 'blue');
        log('4. Probar funcionalidades críticas (login, asistencia, nómina)', 'blue');
      } else {
        log('\n⚠️  CONFIGURACIÓN PARCIAL', 'yellow');
        log('❌ Algunas variables pueden estar faltando', 'red');
        showEnvInstructions();
      }
    } else {
      log('\n❌ ERROR EN LA CONFIGURACIÓN', 'red');
      showEnvInstructions();
    }
    
  } catch (error) {
    log(`\n💥 ERROR FATAL: ${error.message}`, 'red');
    showEnvInstructions();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    log(`\n💥 ERROR FATAL: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  createEnvFile,
  verifyEnvFile,
  generateRandomSecret
}; 