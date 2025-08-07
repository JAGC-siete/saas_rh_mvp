#!/usr/bin/env node

/**
 * 🧪 SCRIPT DE PRUEBA DE API ENDPOINTS
 * ⚡ Prueba completa de todos los endpoints de la API
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Configuración
const BASE_URL = 'http://localhost:3001';
const TIMEOUT = 10000; // 10 segundos

// Colores para output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
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

// Endpoints a probar
const endpoints = [
    {
        name: 'Health Check',
        url: `${BASE_URL}/api/health`,
        method: 'GET'
    },
    {
        name: 'Login Page',
        url: `${BASE_URL}/login`,
        method: 'GET'
    },
    {
        name: 'Dashboard Page',
        url: `${BASE_URL}/dashboard`,
        method: 'GET'
    },
    {
        name: 'Attendance Register Page',
        url: `${BASE_URL}/attendance/register`,
        method: 'GET'
    },
    {
        name: 'API Attendance Register',
        url: `${BASE_URL}/api/attendance/register`,
        method: 'POST',
        body: JSON.stringify({
            last5: '12345',
            justification: 'Test from script'
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    },
    {
        name: 'API Attendance Lookup',
        url: `${BASE_URL}/api/attendance/lookup`,
        method: 'POST',
        body: JSON.stringify({
            last5: '12345'
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    },
    {
        name: 'API Auth Login Supabase',
        url: `${BASE_URL}/api/auth/login-supabase`,
        method: 'POST',
        body: JSON.stringify({
            email: 'test@example.com',
            password: 'testpassword'
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    },
    {
        name: 'API Payroll Calculate',
        url: `${BASE_URL}/api/payroll/calculate`,
        method: 'POST',
        body: JSON.stringify({
            periodo: '2025-08',
            quincena: 1,
            incluirDeducciones: true
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    }
];

// Función principal
async function runTests() {
    log('🧪 PROBANDO API ENDPOINTS', 'blue');
    log('========================', 'blue');
    log(`Base URL: ${BASE_URL}`, 'yellow');
    log(`Timeout: ${TIMEOUT}ms`, 'yellow');
    log('');
    
    const results = [];
    
    for (const endpoint of endpoints) {
        const options = {
            method: endpoint.method,
            headers: endpoint.headers || {}
        };
        
        if (endpoint.body) {
            options.body = endpoint.body;
        }
        
        const result = await testEndpoint(endpoint.name, endpoint.url, options);
        results.push({
            name: endpoint.name,
            url: endpoint.url,
            ...result
        });
    }
    
    // Resumen final
    log('\n📊 RESUMEN DE RESULTADOS', 'blue');
    log('========================', 'blue');
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const total = results.length;
    
    log(`✅ Exitosos: ${successful}/${total}`, 'green');
    log(`❌ Fallidos: ${failed}/${total}`, failed > 0 ? 'red' : 'green');
    
    if (failed > 0) {
        log('\n❌ ENDPOINTS FALLIDOS:', 'red');
        results.filter(r => !r.success).forEach(r => {
            log(`   - ${r.name}: ${r.error || `Status ${r.status}`}`, 'red');
        });
    }
    
    log('\n🎯 RECOMENDACIONES:', 'yellow');
    if (failed > 0) {
        log('   - Verificar que el servidor esté corriendo en localhost:3001', 'yellow');
        log('   - Revisar logs del servidor para errores', 'yellow');
        log('   - Verificar configuración de variables de entorno', 'yellow');
    } else {
        log('   - Todos los endpoints están funcionando correctamente', 'green');
    }
    
    log('\n🧪 PRUEBA DE API ENDPOINTS COMPLETADA', 'green');
}

// Manejo de errores
process.on('unhandledRejection', (error) => {
    log(`\n💥 Error no manejado: ${error.message}`, 'red');
    process.exit(1);
});

// Ejecutar tests
runTests().catch(error => {
    log(`\n💥 Error ejecutando tests: ${error.message}`, 'red');
    process.exit(1);
}); 