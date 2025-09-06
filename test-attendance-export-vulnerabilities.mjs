#!/usr/bin/env node

/**
 * TEST SUITE: VULNERABILIDADES CRÍTICAS EN SISTEMA DE EXPORTACIÓN DE ASISTENCIA
 * 
 * Este script identifica y prueba las 5 vulnerabilidades críticas:
 * 1. Acceso no autorizado a datos de otras empresas
 * 2. Inyección de fechas maliciosas
 * 3. Bypass de controles de seguridad
 * 4. Exposición de información sensible
 * 5. Path traversal attacks
 */

import fetch from 'node-fetch'
import { performance } from 'perf_hooks'

// Configuración de pruebas
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://humanosisu.net'
const TEST_CONFIG = {
  // Configuración de carga
  LOAD_TEST: {
    concurrent_users: 50,
    requests_per_user: 100,
    duration_seconds: 300
  },
  // Configuración de estrés
  STRESS_TEST: {
    concurrent_users: 50,
    requests_per_user: 100,
    duration_seconds: 300
  },
  // Configuración de resistencia
  RESISTANCE_TEST: {
    concurrent_users: 50,
    requests_per_user: 100,
    duration_seconds: 300
  }
}

// Tokens de prueba (simulados)
const TEST_TOKENS = {
  // Usuario con permisos limitados
  limited_user: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  // Usuario de otra empresa
  other_company: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ODc2NTQzMjEwIiwibmFtZSI6IkFub3RoZXIgVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.another_signature',
  // Token inválido
  invalid: 'invalid_token_12345',
  // Token expirado
  expired: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.expired_signature'
}

// Payloads maliciosos para pruebas
const MALICIOUS_PAYLOADS = {
  // Inyección de fechas
  date_injection: [
    "2024-01-01'; DROP TABLE attendance_records; --",
    "2024-01-01' OR '1'='1",
    "2024-01-01' UNION SELECT * FROM user_profiles --",
    "2024-01-01'; INSERT INTO attendance_records VALUES ('hacked', '2024-01-01', 'present', NOW(), NOW(), 0, 'hacked', 'hacked', 'hacked', 'hacked', 'hacked', 'hacked', NOW(), NOW()); --",
    "2024-01-01' AND (SELECT COUNT(*) FROM user_profiles) > 0 --"
  ],
  
  // Path traversal
  path_traversal: [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
    "....//....//....//etc//passwd",
    "..%2F..%2F..%2Fetc%2Fpasswd",
    "..%252F..%252F..%252Fetc%252Fpasswd"
  ],
  
  // Bypass de autenticación
  auth_bypass: [
    "admin",
    "super_admin",
    "root",
    "administrator",
    "system",
    "null",
    "undefined",
    "true",
    "false",
    "1",
    "0"
  ],
  
  // Inyección SQL
  sql_injection: [
    "'; DROP TABLE attendance_records; --",
    "' OR '1'='1",
    "' UNION SELECT * FROM user_profiles --",
    "'; INSERT INTO attendance_records VALUES ('hacked', '2024-01-01', 'present', NOW(), NOW(), 0, 'hacked', 'hacked', 'hacked', 'hacked', 'hacked', 'hacked', NOW(), NOW()); --",
    "' AND (SELECT COUNT(*) FROM user_profiles) > 0 --"
  ]
}

// Endpoints a probar
const ENDPOINTS = [
  '/api/attendance/export',
  '/api/reports/export-attendance',
  '/api/reports/attendance-trends',
  '/api/attendance',
  '/api/payroll/export'
]

class VulnerabilityTester {
  constructor() {
    this.results = {
      vulnerabilities: [],
      performance: {},
      security_issues: []
    }
  }

  // VULNERABILIDAD 1: Acceso no autorizado a datos de otras empresas
  async testUnauthorizedAccess() {
    console.log('🔍 Probando acceso no autorizado a datos de otras empresas...')
    
    const tests = [
      {
        name: 'Token inválido',
        token: TEST_TOKENS.invalid,
        expected_status: 401
      },
      {
        name: 'Token expirado',
        token: TEST_TOKENS.expired,
        expected_status: 401
      },
      {
        name: 'Sin token',
        token: null,
        expected_status: 401
      },
      {
        name: 'Usuario de otra empresa',
        token: TEST_TOKENS.other_company,
        expected_status: 403
      }
    ]

    for (const test of tests) {
      for (const endpoint of ENDPOINTS) {
        try {
          const headers = test.token ? { 'Authorization': `Bearer ${test.token}` } : {}
          const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...headers
            },
            body: JSON.stringify({
              startDate: '2024-01-01',
              endDate: '2024-01-31',
              formato: 'excel'
            })
          })

          if (response.status !== test.expected_status) {
            this.results.vulnerabilities.push({
              type: 'UNAUTHORIZED_ACCESS',
              endpoint,
              test: test.name,
              expected: test.expected_status,
              actual: response.status,
              severity: 'CRITICAL',
              description: `Acceso no autorizado permitido en ${endpoint}`
            })
          }
        } catch (error) {
          console.error(`Error en test ${test.name} para ${endpoint}:`, error.message)
        }
      }
    }
  }

  // VULNERABILIDAD 2: Inyección de fechas maliciosas
  async testDateInjection() {
    console.log('🔍 Probando inyección de fechas maliciosas...')
    
    for (const endpoint of ENDPOINTS) {
      for (const maliciousDate of MALICIOUS_PAYLOADS.date_injection) {
        try {
          const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${TEST_TOKENS.limited_user}`
            },
            body: JSON.stringify({
              startDate: maliciousDate,
              endDate: '2024-01-31',
              formato: 'excel'
            })
          })

          const responseText = await response.text()
          
          // Verificar si la inyección fue exitosa
          if (responseText.includes('error') || responseText.includes('SQL') || responseText.includes('syntax')) {
            this.results.vulnerabilities.push({
              type: 'DATE_INJECTION',
              endpoint,
              payload: maliciousDate,
              severity: 'CRITICAL',
              description: `Inyección de fecha exitosa en ${endpoint}`
            })
          }
        } catch (error) {
          console.error(`Error en inyección de fecha para ${endpoint}:`, error.message)
        }
      }
    }
  }

  // VULNERABILIDAD 3: Bypass de controles de seguridad
  async testSecurityBypass() {
    console.log('🔍 Probando bypass de controles de seguridad...')
    
    for (const endpoint of ENDPOINTS) {
      for (const bypassPayload of MALICIOUS_PAYLOADS.auth_bypass) {
        try {
          const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${bypassPayload}`
            },
            body: JSON.stringify({
              startDate: '2024-01-01',
              endDate: '2024-01-31',
              formato: 'excel',
              employee_id: bypassPayload
            })
          })

          if (response.status === 200) {
            this.results.vulnerabilities.push({
              type: 'SECURITY_BYPASS',
              endpoint,
              payload: bypassPayload,
              severity: 'CRITICAL',
              description: `Bypass de seguridad exitoso en ${endpoint}`
            })
          }
        } catch (error) {
          console.error(`Error en bypass de seguridad para ${endpoint}:`, error.message)
        }
      }
    }
  }

  // VULNERABILIDAD 4: Exposición de información sensible
  async testSensitiveDataExposure() {
    console.log('🔍 Probando exposición de información sensible...')
    
    for (const endpoint of ENDPOINTS) {
      try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TEST_TOKENS.limited_user}`
          },
          body: JSON.stringify({
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            formato: 'excel'
          })
        })

        const responseText = await response.text()
        
        // Verificar si se expone información sensible
        const sensitivePatterns = [
          /password/i,
          /token/i,
          /secret/i,
          /key/i,
          /private/i,
          /internal/i,
          /debug/i,
          /error.*stack/i,
          /file.*path/i,
          /database.*connection/i
        ]

        for (const pattern of sensitivePatterns) {
          if (pattern.test(responseText)) {
            this.results.vulnerabilities.push({
              type: 'SENSITIVE_DATA_EXPOSURE',
              endpoint,
              pattern: pattern.toString(),
              severity: 'HIGH',
              description: `Información sensible expuesta en ${endpoint}`
            })
          }
        }
      } catch (error) {
        console.error(`Error en test de exposición de datos para ${endpoint}:`, error.message)
      }
    }
  }

  // VULNERABILIDAD 5: Path traversal attacks
  async testPathTraversal() {
    console.log('🔍 Probando ataques de path traversal...')
    
    for (const endpoint of ENDPOINTS) {
      for (const pathPayload of MALICIOUS_PAYLOADS.path_traversal) {
        try {
          const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${TEST_TOKENS.limited_user}`
            },
            body: JSON.stringify({
              startDate: '2024-01-01',
              endDate: '2024-01-31',
              formato: 'excel',
              filename: pathPayload
            })
          })

          const responseText = await response.text()
          
          // Verificar si el path traversal fue exitoso
          if (responseText.includes('root:') || responseText.includes('passwd') || responseText.includes('hosts')) {
            this.results.vulnerabilities.push({
              type: 'PATH_TRAVERSAL',
              endpoint,
              payload: pathPayload,
              severity: 'CRITICAL',
              description: `Path traversal exitoso en ${endpoint}`
            })
          }
        } catch (error) {
          console.error(`Error en path traversal para ${endpoint}:`, error.message)
        }
      }
    }
  }

  // PRUEBAS DE CARGA
  async runLoadTest() {
    console.log('🚀 Ejecutando pruebas de carga...')
    
    const startTime = performance.now()
    const promises = []
    
    for (let i = 0; i < TEST_CONFIG.LOAD_TEST.concurrent_users; i++) {
      promises.push(this.simulateUserLoad(i))
    }
    
    await Promise.all(promises)
    const endTime = performance.now()
    
    this.results.performance.load_test = {
      duration: endTime - startTime,
      concurrent_users: TEST_CONFIG.LOAD_TEST.concurrent_users,
      total_requests: TEST_CONFIG.LOAD_TEST.concurrent_users * TEST_CONFIG.LOAD_TEST.requests_per_user
    }
  }

  // PRUEBAS DE ESTRÉS
  async runStressTest() {
    console.log('💪 Ejecutando pruebas de estrés...')
    
    const startTime = performance.now()
    const promises = []
    
    for (let i = 0; i < TEST_CONFIG.STRESS_TEST.concurrent_users; i++) {
      promises.push(this.simulateUserStress(i))
    }
    
    await Promise.all(promises)
    const endTime = performance.now()
    
    this.results.performance.stress_test = {
      duration: endTime - startTime,
      concurrent_users: TEST_CONFIG.STRESS_TEST.concurrent_users,
      total_requests: TEST_CONFIG.STRESS_TEST.concurrent_users * TEST_CONFIG.STRESS_TEST.requests_per_user
    }
  }

  // PRUEBAS DE RESISTENCIA
  async runResistanceTest() {
    console.log('🛡️ Ejecutando pruebas de resistencia...')
    
    const startTime = performance.now()
    const promises = []
    
    for (let i = 0; i < TEST_CONFIG.RESISTANCE_TEST.concurrent_users; i++) {
      promises.push(this.simulateUserResistance(i))
    }
    
    await Promise.all(promises)
    const endTime = performance.now()
    
    this.results.performance.resistance_test = {
      duration: endTime - startTime,
      concurrent_users: TEST_CONFIG.RESISTANCE_TEST.concurrent_users,
      total_requests: TEST_CONFIG.RESISTANCE_TEST.concurrent_users * TEST_CONFIG.RESISTANCE_TEST.requests_per_user
    }
  }

  async simulateUserLoad(userId) {
    const requests = []
    
    for (let i = 0; i < TEST_CONFIG.LOAD_TEST.requests_per_user; i++) {
      requests.push(this.makeRequest(userId, i))
    }
    
    return Promise.all(requests)
  }

  async simulateUserStress(userId) {
    const requests = []
    
    for (let i = 0; i < TEST_CONFIG.STRESS_TEST.requests_per_user; i++) {
      requests.push(this.makeRequest(userId, i))
    }
    
    return Promise.all(requests)
  }

  async simulateUserResistance(userId) {
    const requests = []
    
    for (let i = 0; i < TEST_CONFIG.RESISTANCE_TEST.requests_per_user; i++) {
      requests.push(this.makeRequest(userId, i))
    }
    
    return Promise.all(requests)
  }

  async makeRequest(userId, requestId) {
    try {
      const endpoint = ENDPOINTS[requestId % ENDPOINTS.length]
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKENS.limited_user}`
        },
        body: JSON.stringify({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          formato: 'excel'
        })
      })
      
      return {
        userId,
        requestId,
        endpoint,
        status: response.status,
        responseTime: performance.now()
      }
    } catch (error) {
      return {
        userId,
        requestId,
        endpoint: 'unknown',
        status: 'error',
        error: error.message,
        responseTime: performance.now()
      }
    }
  }

  // Generar reporte final
  generateReport() {
    console.log('\n' + '='.repeat(80))
    console.log('📊 REPORTE DE VULNERABILIDADES - SISTEMA DE EXPORTACIÓN DE ASISTENCIA')
    console.log('='.repeat(80))
    
    console.log('\n🔴 VULNERABILIDADES CRÍTICAS ENCONTRADAS:')
    console.log('-'.repeat(50))
    
    if (this.results.vulnerabilities.length === 0) {
      console.log('✅ No se encontraron vulnerabilidades críticas')
    } else {
      this.results.vulnerabilities.forEach((vuln, index) => {
        console.log(`${index + 1}. ${vuln.type}`)
        console.log(`   Endpoint: ${vuln.endpoint}`)
        console.log(`   Severidad: ${vuln.severity}`)
        console.log(`   Descripción: ${vuln.description}`)
        if (vuln.payload) console.log(`   Payload: ${vuln.payload}`)
        console.log('')
      })
    }
    
    console.log('\n📈 MÉTRICAS DE RENDIMIENTO:')
    console.log('-'.repeat(50))
    
    if (this.results.performance.load_test) {
      console.log('Prueba de Carga:')
      console.log(`  - Duración: ${this.results.performance.load_test.duration.toFixed(2)}ms`)
      console.log(`  - Usuarios concurrentes: ${this.results.performance.load_test.concurrent_users}`)
      console.log(`  - Total de requests: ${this.results.performance.load_test.total_requests}`)
    }
    
    if (this.results.performance.stress_test) {
      console.log('Prueba de Estrés:')
      console.log(`  - Duración: ${this.results.performance.stress_test.duration.toFixed(2)}ms`)
      console.log(`  - Usuarios concurrentes: ${this.results.performance.stress_test.concurrent_users}`)
      console.log(`  - Total de requests: ${this.results.performance.stress_test.total_requests}`)
    }
    
    if (this.results.performance.resistance_test) {
      console.log('Prueba de Resistencia:')
      console.log(`  - Duración: ${this.results.performance.resistance_test.duration.toFixed(2)}ms`)
      console.log(`  - Usuarios concurrentes: ${this.results.performance.resistance_test.concurrent_users}`)
      console.log(`  - Total de requests: ${this.results.performance.resistance_test.total_requests}`)
    }
    
    console.log('\n🛡️ RECOMENDACIONES DE SEGURIDAD:')
    console.log('-'.repeat(50))
    console.log('1. Implementar validación estricta de entrada en todos los endpoints')
    console.log('2. Aplicar rate limiting para prevenir ataques de fuerza bruta')
    console.log('3. Implementar logging de seguridad para detectar intentos de acceso no autorizado')
    console.log('4. Validar y sanitizar todos los parámetros de entrada')
    console.log('5. Implementar Row Level Security (RLS) en Supabase')
    console.log('6. Aplicar principios de menor privilegio en la autenticación')
    console.log('7. Implementar monitoreo de seguridad en tiempo real')
    
    console.log('\n' + '='.repeat(80))
  }

  // Ejecutar todas las pruebas
  async runAllTests() {
    console.log('🚀 Iniciando pruebas de vulnerabilidades del sistema de exportación de asistencia...')
    
    // Pruebas de vulnerabilidades
    await this.testUnauthorizedAccess()
    await this.testDateInjection()
    await this.testSecurityBypass()
    await this.testSensitiveDataExposure()
    await this.testPathTraversal()
    
    // Pruebas de rendimiento
    await this.runLoadTest()
    await this.runStressTest()
    await this.runResistanceTest()
    
    // Generar reporte
    this.generateReport()
  }
}

// Ejecutar las pruebas
async function main() {
  const tester = new VulnerabilityTester()
  await tester.runAllTests()
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export default VulnerabilityTester
