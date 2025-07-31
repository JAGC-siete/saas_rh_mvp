#!/usr/bin/env node

/**
 * 🔍 SCRIPT DE VERIFICACIÓN DE CORRECCIONES DE INTEGRACIÓN
 * Verifica que las correcciones aplicadas funcionen correctamente
 * 
 * Uso: node scripts/verify-integration-fixes.js
 */

const fs = require('fs');
const path = require('path');

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

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
}

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

// 1. VERIFICAR CREDENCIALES HARDCODEADAS
function verifySupabaseClient() {
  log('\n🔍 VERIFICANDO CREDENCIALES HARDCODEADAS', 'bold');
  
  const filePath = 'lib/supabase/client.ts';
  const content = readFile(filePath);
  
  if (!content) {
    log('❌ Archivo no encontrado', 'red');
    return false;
  }
  
  // Verificar que no hay credenciales hardcodeadas
  const hasHardcodedUrl = content.includes("'https://fwyxmovfrzauebiqxchz.supabase.co'");
  const hasHardcodedKey = content.includes("'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
  const hasEnvVars = content.includes('process.env.NEXT_PUBLIC_SUPABASE_URL') && 
                     content.includes('process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  if (hasHardcodedUrl || hasHardcodedKey) {
    log('❌ Credenciales hardcodeadas encontradas', 'red');
    return false;
  }
  
  if (!hasEnvVars) {
    log('❌ Variables de entorno no encontradas', 'red');
    return false;
  }
  
  log('✅ Credenciales hardcodeadas corregidas', 'green');
  return true;
}

// 2. VERIFICAR MIDDLEWARE DE AUTENTICACIÓN
function verifyMiddleware() {
  log('\n🔍 VERIFICANDO MIDDLEWARE DE AUTENTICACIÓN', 'bold');
  
  const filePath = 'middleware.ts';
  const content = readFile(filePath);
  
  if (!content) {
    log('❌ Archivo no encontrado', 'red');
    return false;
  }
  
  // Verificar mejoras en el middleware
  const hasAuthCheck = content.includes('authorization') || content.includes('cookie');
  const hasRedirect = content.includes('NextResponse.redirect');
  const hasCorsFix = content.includes('NEXT_PUBLIC_SITE_URL');
  
  if (!hasAuthCheck) {
    log('❌ Validación de autenticación no implementada', 'red');
    return false;
  }
  
  if (!hasRedirect) {
    log('❌ Redirección de autenticación no implementada', 'red');
    return false;
  }
  
  if (!hasCorsFix) {
    log('❌ Configuración CORS específica no implementada', 'red');
    return false;
  }
  
  log('✅ Middleware de autenticación mejorado', 'green');
  return true;
}

// 3. VERIFICAR CONFIGURACIÓN CORS
function verifyCorsConfig() {
  log('\n🔍 VERIFICANDO CONFIGURACIÓN CORS', 'bold');
  
  const filePath = 'next.config.js';
  const content = readFile(filePath);
  
  if (!content) {
    log('❌ Archivo no encontrado', 'red');
    return false;
  }
  
  // Verificar que CORS no sea demasiado permisivo
  const hasWildcardCors = content.includes("value: '*'");
  const hasSpecificCors = content.includes('NEXT_PUBLIC_SITE_URL');
  
  if (hasWildcardCors && !hasSpecificCors) {
    log('❌ CORS aún es demasiado permisivo', 'red');
    return false;
  }
  
  if (hasSpecificCors) {
    log('✅ CORS configurado específicamente', 'green');
    return true;
  }
  
  log('⚠️ CORS necesita revisión manual', 'yellow');
  return false;
}

// 4. VERIFICAR SERVICIO CENTRALIZADO DE API
function verifyApiService() {
  log('\n🔍 VERIFICANDO SERVICIO CENTRALIZADO DE API', 'bold');
  
  const filePath = 'lib/services/api.ts';
  
  if (!checkFileExists(filePath)) {
    log('❌ Servicio de API no encontrado', 'red');
    return false;
  }
  
  const content = readFile(filePath);
  
  if (!content) {
    log('❌ Error leyendo servicio de API', 'red');
    return false;
  }
  
  // Verificar características del servicio
  const hasApiError = content.includes('class ApiError');
  const hasAuthHeaders = content.includes('getAuthHeaders');
  const hasAttendanceMethods = content.includes('registerAttendance');
  const hasPayrollMethods = content.includes('calculatePayroll');
  
  if (!hasApiError) {
    log('❌ Clase ApiError no encontrada', 'red');
    return false;
  }
  
  if (!hasAuthHeaders) {
    log('❌ Método getAuthHeaders no encontrado', 'red');
    return false;
  }
  
  if (!hasAttendanceMethods) {
    log('❌ Métodos de asistencia no encontrados', 'red');
    return false;
  }
  
  if (!hasPayrollMethods) {
    log('❌ Métodos de nómina no encontrados', 'red');
    return false;
  }
  
  log('✅ Servicio centralizado de API creado', 'green');
  return true;
}

// 5. VERIFICAR HOOK PERSONALIZADO
function verifyApiHook() {
  log('\n🔍 VERIFICANDO HOOK PERSONALIZADO', 'bold');
  
  const filePath = 'lib/hooks/useApi.ts';
  
  if (!checkFileExists(filePath)) {
    log('❌ Hook de API no encontrado', 'red');
    return false;
  }
  
  const content = readFile(filePath);
  
  if (!content) {
    log('❌ Error leyendo hook de API', 'red');
    return false;
  }
  
  // Verificar características del hook
  const hasUseApi = content.includes('function useApi');
  const hasUseAttendance = content.includes('function useAttendance');
  const hasUsePayroll = content.includes('function usePayroll');
  const hasErrorHandling = content.includes('setError');
  
  if (!hasUseApi) {
    log('❌ Hook useApi no encontrado', 'red');
    return false;
  }
  
  if (!hasUseAttendance) {
    log('❌ Hook useAttendance no encontrado', 'red');
    return false;
  }
  
  if (!hasUsePayroll) {
    log('❌ Hook usePayroll no encontrado', 'red');
    return false;
  }
  
  if (!hasErrorHandling) {
    log('❌ Manejo de errores no encontrado', 'red');
    return false;
  }
  
  log('✅ Hook personalizado creado', 'green');
  return true;
}

// 6. VERIFICAR COMPONENTE DE ERROR BOUNDARY
function verifyErrorBoundary() {
  log('\n🔍 VERIFICANDO COMPONENTE DE ERROR BOUNDARY', 'bold');
  
  const filePath = 'components/ErrorBoundary.tsx';
  
  if (!checkFileExists(filePath)) {
    log('❌ Error Boundary no encontrado', 'red');
    return false;
  }
  
  const content = readFile(filePath);
  
  if (!content) {
    log('❌ Error leyendo Error Boundary', 'red');
    return false;
  }
  
  // Verificar características del Error Boundary
  const hasErrorBoundary = content.includes('class ErrorBoundary');
  const hasGetDerivedStateFromError = content.includes('getDerivedStateFromError');
  const hasComponentDidCatch = content.includes('componentDidCatch');
  const hasFallbackUI = content.includes('Algo salió mal');
  
  if (!hasErrorBoundary) {
    log('❌ Clase ErrorBoundary no encontrada', 'red');
    return false;
  }
  
  if (!hasGetDerivedStateFromError) {
    log('❌ getDerivedStateFromError no encontrado', 'red');
    return false;
  }
  
  if (!hasComponentDidCatch) {
    log('❌ componentDidCatch no encontrado', 'red');
    return false;
  }
  
  if (!hasFallbackUI) {
    log('❌ UI de fallback no encontrada', 'red');
    return false;
  }
  
  log('✅ Error Boundary creado', 'green');
  return true;
}

// 7. VERIFICAR ESQUEMAS DE VALIDACIÓN
function verifyValidationSchemas() {
  log('\n🔍 VERIFICANDO ESQUEMAS DE VALIDACIÓN', 'bold');
  
  const filePath = 'lib/validation/schemas.ts';
  
  if (!checkFileExists(filePath)) {
    log('❌ Esquemas de validación no encontrados', 'red');
    return false;
  }
  
  const content = readFile(filePath);
  
  if (!content) {
    log('❌ Error leyendo esquemas de validación', 'red');
    return false;
  }
  
  // Verificar características de validación
  const hasValidationError = content.includes('class ValidationError');
  const hasPeriodoValidation = content.includes('validatePeriodo');
  const hasQuincenaValidation = content.includes('validateQuincena');
  const hasLast5Validation = content.includes('validateLast5');
  const hasEmailValidation = content.includes('validateEmail');
  
  if (!hasValidationError) {
    log('❌ Clase ValidationError no encontrada', 'red');
    return false;
  }
  
  if (!hasPeriodoValidation) {
    log('❌ Validación de periodo no encontrada', 'red');
    return false;
  }
  
  if (!hasQuincenaValidation) {
    log('❌ Validación de quincena no encontrada', 'red');
    return false;
  }
  
  if (!hasLast5Validation) {
    log('❌ Validación de last5 no encontrada', 'red');
    return false;
  }
  
  if (!hasEmailValidation) {
    log('❌ Validación de email no encontrada', 'red');
    return false;
  }
  
  log('✅ Esquemas de validación creados', 'green');
  return true;
}

// 8. VERIFICAR ENDPOINTS CRÍTICOS
function verifyCriticalEndpoints() {
  log('\n🔍 VERIFICANDO ENDPOINTS CRÍTICOS', 'bold');
  
  const endpoints = [
    'pages/api/auth/login-supabase.ts',
    'pages/api/attendance/register.ts',
    'pages/api/payroll/calculate.ts',
    'pages/api/health.ts'
  ];
  
  let allExist = true;
  
  for (const endpoint of endpoints) {
    if (!checkFileExists(endpoint)) {
      log(`❌ Endpoint no encontrado: ${endpoint}`, 'red');
      allExist = false;
    } else {
      log(`✅ Endpoint encontrado: ${endpoint}`, 'green');
    }
  }
  
  return allExist;
}

// 9. VERIFICAR COMPONENTES CRÍTICOS
function verifyCriticalComponents() {
  log('\n🔍 VERIFICANDO COMPONENTES CRÍTICOS', 'bold');
  
  const components = [
    'components/PayrollManager.tsx',
    'components/AttendanceManager.tsx',
    'components/AuthForm.tsx',
    'components/ProtectedRoute.tsx'
  ];
  
  let allExist = true;
  
  for (const component of components) {
    if (!checkFileExists(component)) {
      log(`❌ Componente no encontrado: ${component}`, 'red');
      allExist = false;
    } else {
      log(`✅ Componente encontrado: ${component}`, 'green');
    }
  }
  
  return allExist;
}

// 10. VERIFICAR VARIABLES DE ENTORNO
function verifyEnvironmentVariables() {
  log('\n🔍 VERIFICANDO VARIABLES DE ENTORNO', 'bold');
  
  const envFile = '.env.local';
  const envExample = '.env.example';
  
  // Verificar si existe archivo de ejemplo
  if (!checkFileExists(envExample)) {
    log('⚠️ Archivo .env.example no encontrado', 'yellow');
  } else {
    log('✅ Archivo .env.example encontrado', 'green');
  }
  
  // Verificar variables críticas en archivos de configuración
  const configFiles = [
    'lib/supabase/client.ts',
    'lib/supabase/server.ts',
    'next.config.js'
  ];
  
  let hasEnvVars = true;
  
  for (const file of configFiles) {
    const content = readFile(file);
    if (content && content.includes('process.env.')) {
      log(`✅ Variables de entorno en ${file}`, 'green');
    } else {
      log(`⚠️ Variables de entorno no encontradas en ${file}`, 'yellow');
      hasEnvVars = false;
    }
  }
  
  return hasEnvVars;
}

// FUNCIÓN PRINCIPAL
async function main() {
  log('🔍 INICIANDO VERIFICACIÓN DE CORRECCIONES DE INTEGRACIÓN', 'bold');
  log('=' .repeat(70), 'blue');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    details: []
  };
  
  // Ejecutar verificaciones
  const verifications = [
    { name: 'Credenciales hardcodeadas', fn: verifySupabaseClient },
    { name: 'Middleware de autenticación', fn: verifyMiddleware },
    { name: 'Configuración CORS', fn: verifyCorsConfig },
    { name: 'Servicio centralizado de API', fn: verifyApiService },
    { name: 'Hook personalizado', fn: verifyApiHook },
    { name: 'Error Boundary', fn: verifyErrorBoundary },
    { name: 'Esquemas de validación', fn: verifyValidationSchemas },
    { name: 'Endpoints críticos', fn: verifyCriticalEndpoints },
    { name: 'Componentes críticos', fn: verifyCriticalComponents },
    { name: 'Variables de entorno', fn: verifyEnvironmentVariables }
  ];
  
  for (const verification of verifications) {
    results.total++;
    log(`\n🔍 Verificando: ${verification.name}`, 'blue');
    
    try {
      const passed = verification.fn();
      if (passed) {
        results.passed++;
        log(`✅ ${verification.name}: PASÓ`, 'green');
      } else {
        results.failed++;
        log(`❌ ${verification.name}: FALLÓ`, 'red');
      }
      
      results.details.push({
        name: verification.name,
        passed,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      results.failed++;
      log(`❌ ${verification.name}: ERROR - ${error.message}`, 'red');
      results.details.push({
        name: verification.name,
        passed: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // Mostrar resumen
  log('\n📊 RESUMEN DE VERIFICACIÓN', 'bold');
  log('=' .repeat(50), 'blue');
  log(`Total de verificaciones: ${results.total}`, 'blue');
  log(`✅ Pasadas: ${results.passed}`, 'green');
  log(`❌ Fallidas: ${results.failed}`, 'red');
  
  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  log(`📈 Tasa de éxito: ${successRate}%`, successRate >= 80 ? 'green' : 'yellow');
  
  if (results.failed > 0) {
    log('\n❌ VERIFICACIONES FALLIDAS:', 'red');
    results.details
      .filter(d => !d.passed)
      .forEach(d => {
        log(`  - ${d.name}: ${d.error || 'No cumple criterios'}`, 'red');
      });
  }
  
  // Guardar reporte
  const reportPath = 'audit-reports/verification-report.json';
  const reportDir = path.dirname(reportPath);
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      successRate: parseFloat(successRate)
    },
    details: results.details,
    recommendations: results.failed > 0 ? [
      'Revisar las verificaciones fallidas',
      'Ejecutar el script de corrección nuevamente',
      'Verificar manualmente los archivos problemáticos',
      'Actualizar variables de entorno si es necesario'
    ] : [
      'Todas las correcciones verificadas exitosamente',
      'Probar funcionalidades críticas manualmente',
      'Implementar tests de integración',
      'Documentar los cambios realizados'
    ]
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n📄 Reporte guardado: ${reportPath}`, 'green');
  
  // Conclusión
  if (results.failed === 0) {
    log('\n🎉 TODAS LAS VERIFICACIONES PASARON', 'bold');
    log('✅ Las correcciones de integración están funcionando correctamente', 'green');
  } else {
    log('\n⚠️ ALGUNAS VERIFICACIONES FALLARON', 'bold');
    log('❌ Revisar las correcciones fallidas antes de continuar', 'red');
  }
  
  log('\n📝 PRÓXIMOS PASOS:', 'blue');
  if (results.failed === 0) {
    log('1. Probar funcionalidades críticas manualmente', 'yellow');
    log('2. Implementar tests de integración', 'yellow');
    log('3. Documentar los cambios realizados', 'yellow');
    log('4. Actualizar variables de entorno en producción', 'yellow');
  } else {
    log('1. Revisar las verificaciones fallidas', 'yellow');
    log('2. Ejecutar correcciones manuales si es necesario', 'yellow');
    log('3. Volver a ejecutar este script de verificación', 'yellow');
    log('4. No proceder hasta que todas las verificaciones pasen', 'yellow');
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
  verifySupabaseClient,
  verifyMiddleware,
  verifyCorsConfig,
  verifyApiService,
  verifyApiHook,
  verifyErrorBoundary,
  verifyValidationSchemas,
  verifyCriticalEndpoints,
  verifyCriticalComponents,
  verifyEnvironmentVariables
}; 