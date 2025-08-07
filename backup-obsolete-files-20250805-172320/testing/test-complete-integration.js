#!/usr/bin/env node

/**
 * 🧪 SCRIPT DE PRUEBA DE INTEGRACIÓN COMPLETA
 * ⚡ Prueba frontend, backend y middleware
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');
const path = require('path');

// Configuración
const BASE_URL = 'http://localhost:3001';
const TIMEOUT = 15000; // 15 segundos

// Colores para output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

// Función para logging
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Función para hacer requests con timeout
async function makeRequest(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// Función para verificar archivos
function checkFile(filePath, description) {
    try {
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            log(`✅ ${description}: ${filePath} (${stats.size} bytes)`, 'green');
            return true;
        } else {
            log(`❌ ${description}: ${filePath} NO ENCONTRADO`, 'red');
            return false;
        }
    } catch (error) {
        log(`❌ ${description}: Error verificando ${filePath} - ${error.message}`, 'red');
        return false;
    }
}

// Función para analizar archivo
function analyzeFile(filePath, patterns) {
    try {
        if (!fs.existsSync(filePath)) return [];
        
        const content = fs.readFileSync(filePath, 'utf8');
        const findings = [];
        
        for (const [pattern, description] of Object.entries(patterns)) {
            if (content.includes(pattern)) {
                findings.push(description);
            }
        }
        
        return findings;
    } catch (error) {
        return [`Error analizando archivo: ${error.message}`];
    }
}

// Función para probar un endpoint
async function testEndpoint(name, url, options = {}) {
    log(`\n🔍 Probando: ${name}`, 'blue');
    log(`   URL: ${url}`, 'blue');
    
    try {
        const startTime = Date.now();
        const response = await makeRequest(url, options);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        log(`   Status: ${response.status}`, response.ok ? 'green' : 'red');
        log(`   Tiempo: ${duration}ms`, 'yellow');
        
        if (response.ok) {
            try {
                const data = await response.json();
                log(`   Response: ${JSON.stringify(data, null, 2)}`, 'green');
            } catch (e) {
                const text = await response.text();
                log(`   Response: ${text.substring(0, 200)}...`, 'green');
            }
        } else {
            const errorText = await response.text();
            log(`   Error: ${errorText}`, 'red');
        }
        
        return { success: response.ok, status: response.status, duration };
    } catch (error) {
        log(`   Error: ${error.message}`, 'red');
        return { success: false, error: error.message };
    }
}

// Función para verificar middleware
function testMiddleware() {
    log('\n🛡️ VERIFICANDO MIDDLEWARE', 'magenta');
    log('========================', 'magenta');
    
    const middlewareFile = 'middleware.ts';
    const findings = analyzeFile(middlewareFile, {
        'PUBLIC_ROUTES': 'Rutas públicas configuradas',
        'supabase.auth.getUser': 'Autenticación Supabase implementada',
        'createServerClient': 'Cliente Supabase del servidor configurado',
        'logger': 'Sistema de logging integrado',
        'NextResponse.redirect': 'Redirecciones configuradas',
        'isPublicRoute': 'Función de verificación de rutas públicas'
    });
    
    if (findings.length > 0) {
        findings.forEach(finding => log(`   ✅ ${finding}`, 'green'));
    } else {
        log(`   ⚠️ No se encontraron patrones específicos en ${middlewareFile}`, 'yellow');
    }
    
    return findings.length > 0;
}

// Función para verificar frontend
function testFrontend() {
    log('\n🎨 VERIFICANDO FRONTEND', 'cyan');
    log('======================', 'cyan');
    
    const frontendFiles = [
        { path: 'pages/login.tsx', desc: 'Página de login' },
        { path: 'pages/dashboard.tsx', desc: 'Página de dashboard' },
        { path: 'pages/attendance/register.tsx', desc: 'Página de registro de asistencia' },
        { path: 'components/PayrollManager.tsx', desc: 'Componente de nómina' },
        { path: 'components/AttendanceManager.tsx', desc: 'Componente de asistencia' },
        { path: 'lib/auth.tsx', desc: 'Sistema de autenticación' }
    ];
    
    let successCount = 0;
    
    frontendFiles.forEach(file => {
        if (checkFile(file.path, file.desc)) {
            successCount++;
            
            // Analizar patrones específicos
            const patterns = {
                'useAuth': 'Hook de autenticación usado',
                'useEffect': 'Hooks de React implementados',
                'fetch': 'Llamadas a API implementadas',
                'supabase': 'Cliente Supabase usado',
                'useState': 'Estado de React implementado'
            };
            
            const findings = analyzeFile(file.path, patterns);
            findings.forEach(finding => log(`      ✅ ${finding}`, 'green'));
        }
    });
    
    return successCount === frontendFiles.length;
}

// Función para verificar backend
function testBackend() {
    log('\n⚙️ VERIFICANDO BACKEND', 'yellow');
    log('=====================', 'yellow');
    
    const backendFiles = [
        { path: 'pages/api/health.ts', desc: 'Endpoint de health check' },
        { path: 'pages/api/attendance/register.ts', desc: 'Endpoint de registro de asistencia' },
        { path: 'pages/api/auth/login-supabase.ts', desc: 'Endpoint de login Supabase' },
        { path: 'pages/api/payroll/calculate.ts', desc: 'Endpoint de cálculo de nómina' },
        { path: 'lib/logger.ts', desc: 'Sistema de logging' },
        { path: 'lib/supabase/server.ts', desc: 'Cliente Supabase del servidor' }
    ];
    
    let successCount = 0;
    
    backendFiles.forEach(file => {
        if (checkFile(file.path, file.desc)) {
            successCount++;
            
            // Analizar patrones específicos
            const patterns = {
                'NextApiRequest': 'Tipos de Next.js API implementados',
                'NextApiResponse': 'Respuestas de API configuradas',
                'createAdminClient': 'Cliente admin de Supabase usado',
                'logger': 'Sistema de logging usado',
                'try/catch': 'Manejo de errores implementado'
            };
            
            const findings = analyzeFile(file.path, patterns);
            findings.forEach(finding => log(`      ✅ ${finding}`, 'green'));
        }
    });
    
    return successCount === backendFiles.length;
}

// Función para verificar configuración
function testConfiguration() {
    log('\n⚙️ VERIFICANDO CONFIGURACIÓN', 'blue');
    log('============================', 'blue');
    
    const configFiles = [
        { path: '.env.local', desc: 'Variables de entorno locales' },
        { path: 'next.config.js', desc: 'Configuración de Next.js' },
        { path: 'package.json', desc: 'Dependencias del proyecto' },
        { path: 'tsconfig.json', desc: 'Configuración de TypeScript' },
        { path: 'middleware.ts', desc: 'Configuración de middleware' }
    ];
    
    let successCount = 0;
    
    configFiles.forEach(file => {
        if (checkFile(file.path, file.desc)) {
            successCount++;
        }
    });
    
    // Verificar variables de entorno críticas
    if (fs.existsSync('.env.local')) {
        const envContent = fs.readFileSync('.env.local', 'utf8');
        const criticalVars = [
            'NEXT_PUBLIC_SUPABASE_URL',
            'NEXT_PUBLIC_SUPABASE_ANON_KEY',
            'SUPABASE_SERVICE_ROLE_KEY'
        ];
        
        criticalVars.forEach(varName => {
            if (envContent.includes(varName)) {
                log(`   ✅ ${varName} configurada`, 'green');
            } else {
                log(`   ❌ ${varName} NO configurada`, 'red');
            }
        });
    }
    
    return successCount === configFiles.length;
}

// Función para probar integración completa
async function testIntegration() {
    log('\n🔗 PROBANDO INTEGRACIÓN COMPLETA', 'magenta');
    log('================================', 'magenta');
    
    const integrationTests = [
        {
            name: 'Health Check (Backend)',
            url: `${BASE_URL}/api/health`,
            method: 'GET'
        },
        {
            name: 'Login Page (Frontend)',
            url: `${BASE_URL}/login`,
            method: 'GET'
        },
        {
            name: 'Attendance Register (Frontend)',
            url: `${BASE_URL}/attendance/register`,
            method: 'GET'
        },
        {
            name: 'API Attendance Register (Backend)',
            url: `${BASE_URL}/api/attendance/register`,
            method: 'POST',
            body: JSON.stringify({
                last5: '12345',
                justification: 'Test de integración'
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        }
    ];
    
    const results = [];
    
    for (const test of integrationTests) {
        const options = {
            method: test.method,
            headers: test.headers || {}
        };
        
        if (test.body) {
            options.body = test.body;
        }
        
        const result = await testEndpoint(test.name, test.url, options);
        results.push({
            name: test.name,
            ...result
        });
    }
    
    return results;
}

// Función principal
async function runCompleteTest() {
    log('🧪 PRUEBA DE INTEGRACIÓN COMPLETA', 'blue');
    log('================================', 'blue');
    log(`Base URL: ${BASE_URL}`, 'yellow');
    log(`Timeout: ${TIMEOUT}ms`, 'yellow');
    log('');
    
    const results = {
        middleware: false,
        frontend: false,
        backend: false,
        configuration: false,
        integration: []
    };
    
    // 1. Verificar middleware
    results.middleware = testMiddleware();
    
    // 2. Verificar frontend
    results.frontend = testFrontend();
    
    // 3. Verificar backend
    results.backend = testBackend();
    
    // 4. Verificar configuración
    results.configuration = testConfiguration();
    
    // 5. Probar integración
    results.integration = await testIntegration();
    
    // Resumen final
    log('\n📊 RESUMEN COMPLETO', 'blue');
    log('==================', 'blue');
    
    log(`🛡️ Middleware: ${results.middleware ? '✅ OK' : '❌ FALLA'}`, results.middleware ? 'green' : 'red');
    log(`🎨 Frontend: ${results.frontend ? '✅ OK' : '❌ FALLA'}`, results.frontend ? 'green' : 'red');
    log(`⚙️ Backend: ${results.backend ? '✅ OK' : '❌ FALLA'}`, results.backend ? 'green' : 'red');
    log(`⚙️ Configuración: ${results.configuration ? '✅ OK' : '❌ FALLA'}`, results.configuration ? 'green' : 'red');
    
    const integrationSuccess = results.integration.filter(r => r.success).length;
    const integrationTotal = results.integration.length;
    log(`🔗 Integración: ${integrationSuccess}/${integrationTotal} ✅`, integrationSuccess === integrationTotal ? 'green' : 'red');
    
    // Recomendaciones
    log('\n🎯 RECOMENDACIONES:', 'yellow');
    
    if (!results.middleware) {
        log('   - Revisar configuración del middleware', 'yellow');
    }
    
    if (!results.frontend) {
        log('   - Verificar componentes del frontend', 'yellow');
    }
    
    if (!results.backend) {
        log('   - Revisar endpoints del backend', 'yellow');
    }
    
    if (!results.configuration) {
        log('   - Verificar archivos de configuración', 'yellow');
    }
    
    if (integrationSuccess < integrationTotal) {
        log('   - Verificar que el servidor esté corriendo en localhost:3001', 'yellow');
        log('   - Revisar logs del servidor para errores', 'yellow');
    }
    
    if (results.middleware && results.frontend && results.backend && results.configuration && integrationSuccess === integrationTotal) {
        log('   - 🎉 ¡Sistema completamente funcional!', 'green');
    }
    
    log('\n🧪 PRUEBA DE INTEGRACIÓN COMPLETA FINALIZADA', 'green');
}

// Manejo de errores
process.on('unhandledRejection', (error) => {
    log(`\n💥 Error no manejado: ${error.message}`, 'red');
    process.exit(1);
});

// Ejecutar tests
runCompleteTest().catch(error => {
    log(`\n💥 Error ejecutando tests: ${error.message}`, 'red');
    process.exit(1);
}); 