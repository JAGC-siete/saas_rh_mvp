#!/usr/bin/env node

/**
 * TEST RÁPIDO: VULNERABILIDADES CRÍTICAS EN SISTEMA DE EXPORTACIÓN DE PAYROLL
 * 
 * Verifica las 5 vulnerabilidades críticas de forma rápida y específica
 */

import fetch from 'node-fetch'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://humanosisu.net'

// Test tokens simulados
const TEST_TOKENS = {
  valid_user: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  invalid_token: 'invalid_token_12345',
  other_company: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ODc2NTQzMjEwIiwibmFtZSI6IkFub3RoZXIgVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.another_signature'
}

// Payloads maliciosos específicos
const MALICIOUS_PAYLOADS = {
  date_injection: [
    "2024-01-01'; DROP TABLE payroll_records; --",
    "2024-01-01' OR '1'='1",
    "2024-01-01' UNION SELECT * FROM user_profiles --",
    "2024-13-01", // Fecha inválida
    "2024-02-30"  // Fecha inválida
  ],
  path_traversal: [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
    "....//....//....//etc//passwd"
  ]
}

class QuickVulnerabilityTester {
  constructor() {
    this.results = {
      vulnerabilities: [],
      tests_run: 0,
      tests_passed: 0,
      tests_failed: 0
    }
  }

  async testVulnerability(name, testFunction) {
    console.log(`🔍 ${name}...`)
    try {
      await testFunction()
      this.results.tests_passed++
      console.log(`✅ ${name} - OK`)
    } catch (error) {
      this.results.tests_failed++
      console.log(`❌ ${name} - FALLO: ${error.message}`)
    }
    this.results.tests_run++
  }

  // VULNERABILIDAD 1: Acceso no autorizado
  async testUnauthorizedAccess() {
    const tests = [
      { token: null, expected: 401, name: 'Sin token' },
      { token: TEST_TOKENS.invalid_token, expected: 401, name: 'Token inválido' },
      { token: TEST_TOKENS.other_company, expected: 403, name: 'Usuario otra empresa' }
    ]

    for (const test of tests) {
      const headers = test.token ? { 'Authorization': `Bearer ${test.token}` } : {}
      const response = await fetch(`${BASE_URL}/api/payroll/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ periodo: '2024-01', formato: 'excel' })
      })

      if (response.status !== test.expected) {
        this.results.vulnerabilities.push({
          type: 'UNAUTHORIZED_ACCESS',
          test: test.name,
          expected: test.expected,
          actual: response.status,
          severity: 'CRITICAL'
        })
        throw new Error(`Acceso no autorizado permitido: ${test.name}`)
      }
    }
  }

  // VULNERABILIDAD 2: Inyección de fechas
  async testDateInjection() {
    for (const maliciousDate of MALICIOUS_PAYLOADS.date_injection) {
      const response = await fetch(`${BASE_URL}/api/payroll/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKENS.valid_user}`
        },
        body: JSON.stringify({ 
          periodo: maliciousDate, 
          formato: 'excel' 
        })
      })

      const responseText = await response.text()
      
      // Verificar si la inyección fue exitosa
      if (responseText.includes('error') || responseText.includes('SQL') || responseText.includes('syntax')) {
        this.results.vulnerabilities.push({
          type: 'DATE_INJECTION',
          payload: maliciousDate,
          severity: 'CRITICAL'
        })
        throw new Error(`Inyección de fecha exitosa: ${maliciousDate}`)
      }
    }
  }

  // VULNERABILIDAD 3: Bypass de seguridad
  async testSecurityBypass() {
    const bypassPayloads = ['admin', 'super_admin', 'root', 'null', 'undefined', '1', '0']
    
    for (const payload of bypassPayloads) {
      const response = await fetch(`${BASE_URL}/api/payroll/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${payload}`
        },
        body: JSON.stringify({ periodo: '2024-01', formato: 'excel' })
      })

      if (response.status === 200) {
        this.results.vulnerabilities.push({
          type: 'SECURITY_BYPASS',
          payload: payload,
          severity: 'CRITICAL'
        })
        throw new Error(`Bypass de seguridad exitoso: ${payload}`)
      }
    }
  }

  // VULNERABILIDAD 4: Exposición de información sensible
  async testSensitiveDataExposure() {
    const response = await fetch(`${BASE_URL}/api/payroll/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKENS.valid_user}`
      },
      body: JSON.stringify({ periodo: '2024-01', formato: 'excel' })
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
          pattern: pattern.toString(),
          severity: 'HIGH'
        })
        throw new Error(`Información sensible expuesta: ${pattern}`)
      }
    }
  }

  // VULNERABILIDAD 5: Path traversal
  async testPathTraversal() {
    for (const pathPayload of MALICIOUS_PAYLOADS.path_traversal) {
      const response = await fetch(`${BASE_URL}/api/payroll/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKENS.valid_user}`
        },
        body: JSON.stringify({ 
          periodo: '2024-01', 
          formato: 'excel',
          filename: pathPayload
        })
      })

      const responseText = await response.text()
      
      // Verificar si el path traversal fue exitoso
      if (responseText.includes('root:') || responseText.includes('passwd') || responseText.includes('hosts')) {
        this.results.vulnerabilities.push({
          type: 'PATH_TRAVERSAL',
          payload: pathPayload,
          severity: 'CRITICAL'
        })
        throw new Error(`Path traversal exitoso: ${pathPayload}`)
      }
    }
  }

  // Generar reporte final
  generateReport() {
    console.log('\n' + '='.repeat(60))
    console.log('📊 REPORTE RÁPIDO DE VULNERABILIDADES - PAYROLL EXPORT')
    console.log('='.repeat(60))
    
    console.log(`\n📈 ESTADÍSTICAS:`)
    console.log(`- Tests ejecutados: ${this.results.tests_run}`)
    console.log(`- Tests exitosos: ${this.results.tests_passed}`)
    console.log(`- Tests fallidos: ${this.results.tests_failed}`)
    
    console.log(`\n🔴 VULNERABILIDADES ENCONTRADAS: ${this.results.vulnerabilities.length}`)
    console.log('-'.repeat(40))
    
    if (this.results.vulnerabilities.length === 0) {
      console.log('✅ No se encontraron vulnerabilidades críticas')
    } else {
      this.results.vulnerabilities.forEach((vuln, index) => {
        console.log(`${index + 1}. ${vuln.type}`)
        console.log(`   Severidad: ${vuln.severity}`)
        if (vuln.payload) console.log(`   Payload: ${vuln.payload}`)
        if (vuln.pattern) console.log(`   Patrón: ${vuln.pattern}`)
        console.log('')
      })
    }
    
    console.log('\n🛡️ RECOMENDACIONES INMEDIATAS:')
    console.log('-'.repeat(40))
    console.log('1. Implementar validación estricta de entrada')
    console.log('2. Aplicar filtros de empresa consistentes')
    console.log('3. Sanitizar nombres de archivo')
    console.log('4. Implementar rate limiting')
    console.log('5. Sanitizar logs de información sensible')
    
    console.log('\n' + '='.repeat(60))
  }

  // Ejecutar todas las pruebas
  async runAllTests() {
    console.log('🚀 Iniciando pruebas rápidas de vulnerabilidades...')
    
    await this.testVulnerability('Acceso no autorizado', () => this.testUnauthorizedAccess())
    await this.testVulnerability('Inyección de fechas', () => this.testDateInjection())
    await this.testVulnerability('Bypass de seguridad', () => this.testSecurityBypass())
    await this.testVulnerability('Exposición de datos sensibles', () => this.testSensitiveDataExposure())
    await this.testVulnerability('Path traversal', () => this.testPathTraversal())
    
    this.generateReport()
  }
}

// Ejecutar las pruebas
async function main() {
  const tester = new QuickVulnerabilityTester()
  await tester.runAllTests()
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export default QuickVulnerabilityTester
