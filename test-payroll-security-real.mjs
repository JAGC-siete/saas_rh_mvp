#!/usr/bin/env node

/**
 * TEST REAL: VULNERABILIDADES EN SISTEMA DE EXPORTACIÓN DE PAYROLL
 * Usa credenciales reales para verificar las correcciones de seguridad
 */

import fetch from 'node-fetch'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://humanosisu.net'

class RealSecurityTester {
  constructor() {
    this.results = {
      vulnerabilities: [],
      tests_run: 0,
      tests_passed: 0,
      tests_failed: 0,
      auth_token: null
    }
  }

  // Autenticación real
  async authenticate() {
    console.log('🔐 Autenticando con credenciales reales...')
    
    try {
      const response = await fetch(`${BASE_URL}/api/auth/login-supabase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'jorge7gomez@gmail.com',
          password: 'jorge123456'
        })
      })

      if (!response.ok) {
        throw new Error(`Error de autenticación: ${response.status}`)
      }

      const data = await response.json()
      this.results.auth_token = data.token || data.access_token
      
      if (!this.results.auth_token) {
        throw new Error('No se recibió token de autenticación')
      }

      console.log('✅ Autenticación exitosa')
      return true
    } catch (error) {
      console.log(`❌ Error de autenticación: ${error.message}`)
      return false
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
    if (!this.results.auth_token) {
      throw new Error('No hay token de autenticación')
    }

    // Test 1: Sin token
    const response1 = await fetch(`${BASE_URL}/api/payroll/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ periodo: '2024-01', formato: 'excel' })
    })

    if (response1.status !== 401) {
      this.results.vulnerabilities.push({
        type: 'UNAUTHORIZED_ACCESS',
        test: 'Sin token',
        expected: 401,
        actual: response1.status,
        severity: 'CRITICAL'
      })
      throw new Error(`Acceso no autorizado permitido sin token: ${response1.status}`)
    }

    // Test 2: Token inválido
    const response2 = await fetch(`${BASE_URL}/api/payroll/export`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid_token_12345'
      },
      body: JSON.stringify({ periodo: '2024-01', formato: 'excel' })
    })

    if (response2.status !== 401) {
      this.results.vulnerabilities.push({
        type: 'UNAUTHORIZED_ACCESS',
        test: 'Token inválido',
        expected: 401,
        actual: response2.status,
        severity: 'CRITICAL'
      })
      throw new Error(`Acceso no autorizado permitido con token inválido: ${response2.status}`)
    }
  }

  // VULNERABILIDAD 2: Inyección de fechas
  async testDateInjection() {
    if (!this.results.auth_token) {
      throw new Error('No hay token de autenticación')
    }

    const maliciousDates = [
      "2024-01-01'; DROP TABLE payroll_records; --",
      "2024-01-01' OR '1'='1",
      "2024-13-01", // Fecha inválida
      "2024-02-30", // Fecha inválida
      "2024-01-01' UNION SELECT * FROM user_profiles --"
    ]

    for (const maliciousDate of maliciousDates) {
      const response = await fetch(`${BASE_URL}/api/payroll/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.results.auth_token}`
        },
        body: JSON.stringify({ 
          periodo: maliciousDate, 
          formato: 'excel' 
        })
      })

      const responseText = await response.text()
      
      // Verificar que la validación funciona (debe rechazar fechas maliciosas)
      if (response.status === 200) {
        this.results.vulnerabilities.push({
          type: 'DATE_INJECTION',
          payload: maliciousDate,
          severity: 'CRITICAL'
        })
        throw new Error(`Inyección de fecha exitosa: ${maliciousDate}`)
      }

      // Verificar que se devuelve error de validación
      if (!responseText.includes('inválido') && !responseText.includes('error')) {
        this.results.vulnerabilities.push({
          type: 'DATE_INJECTION',
          payload: maliciousDate,
          severity: 'CRITICAL'
        })
        throw new Error(`Validación de fecha insuficiente: ${maliciousDate}`)
      }
    }
  }

  // VULNERABILIDAD 3: Bypass de seguridad
  async testSecurityBypass() {
    if (!this.results.auth_token) {
      throw new Error('No hay token de autenticación')
    }

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
    if (!this.results.auth_token) {
      throw new Error('No hay token de autenticación')
    }

    const response = await fetch(`${BASE_URL}/api/payroll/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.results.auth_token}`
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
    if (!this.results.auth_token) {
      throw new Error('No hay token de autenticación')
    }

    const pathPayloads = [
      "../../../etc/passwd",
      "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
      "....//....//....//etc//passwd"
    ]

    for (const pathPayload of pathPayloads) {
      const response = await fetch(`${BASE_URL}/api/payroll/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.results.auth_token}`
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

  // Test de validación de entrada
  async testInputValidation() {
    if (!this.results.auth_token) {
      throw new Error('No hay token de autenticación')
    }

    const invalidInputs = [
      { periodo: '', formato: 'excel' },
      { periodo: '2024-13', formato: 'excel' },
      { periodo: '2024-01', formato: 'invalid' },
      { periodo: '2024-01-01', formato: 'excel' }, // Formato incorrecto
      { periodo: '2024-1', formato: 'excel' }, // Formato incorrecto
    ]

    for (const invalidInput of invalidInputs) {
      const response = await fetch(`${BASE_URL}/api/payroll/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.results.auth_token}`
        },
        body: JSON.stringify(invalidInput)
      })

      if (response.status === 200) {
        this.results.vulnerabilities.push({
          type: 'INPUT_VALIDATION',
          input: invalidInput,
          severity: 'HIGH'
        })
        throw new Error(`Validación de entrada insuficiente: ${JSON.stringify(invalidInput)}`)
      }
    }
  }

  // Generar reporte final
  generateReport() {
    console.log('\n' + '='.repeat(70))
    console.log('📊 REPORTE DE SEGURIDAD - PAYROLL EXPORT (CREDENCIALES REALES)')
    console.log('='.repeat(70))
    
    console.log(`\n📈 ESTADÍSTICAS:`)
    console.log(`- Tests ejecutados: ${this.results.tests_run}`)
    console.log(`- Tests exitosos: ${this.results.tests_passed}`)
    console.log(`- Tests fallidos: ${this.results.tests_failed}`)
    console.log(`- Autenticación: ${this.results.auth_token ? '✅ Exitosa' : '❌ Fallida'}`)
    
    console.log(`\n🔴 VULNERABILIDADES ENCONTRADAS: ${this.results.vulnerabilities.length}`)
    console.log('-'.repeat(50))
    
    if (this.results.vulnerabilities.length === 0) {
      console.log('✅ ¡EXCELENTE! No se encontraron vulnerabilidades críticas')
      console.log('✅ El sistema de exportación de payroll está SEGURO')
    } else {
      this.results.vulnerabilities.forEach((vuln, index) => {
        console.log(`${index + 1}. ${vuln.type}`)
        console.log(`   Severidad: ${vuln.severity}`)
        if (vuln.payload) console.log(`   Payload: ${vuln.payload}`)
        if (vuln.pattern) console.log(`   Patrón: ${vuln.pattern}`)
        if (vuln.input) console.log(`   Input: ${JSON.stringify(vuln.input)}`)
        console.log('')
      })
    }
    
    console.log('\n🛡️ ESTADO DE SEGURIDAD:')
    console.log('-'.repeat(50))
    if (this.results.vulnerabilities.length === 0) {
      console.log('🟢 SEGURO - Todas las vulnerabilidades han sido corregidas')
    } else if (this.results.vulnerabilities.length <= 2) {
      console.log('🟡 PARCIALMENTE SEGURO - Algunas vulnerabilidades persisten')
    } else {
      console.log('🔴 VULNERABLE - Múltiples vulnerabilidades críticas')
    }
    
    console.log('\n' + '='.repeat(70))
  }

  // Ejecutar todas las pruebas
  async runAllTests() {
    console.log('🚀 Iniciando pruebas de seguridad con credenciales reales...')
    
    // Autenticación
    const authSuccess = await this.authenticate()
    if (!authSuccess) {
      console.log('❌ No se puede continuar sin autenticación')
      return
    }

    // Pruebas de vulnerabilidades
    await this.testVulnerability('Acceso no autorizado', () => this.testUnauthorizedAccess())
    await this.testVulnerability('Inyección de fechas', () => this.testDateInjection())
    await this.testVulnerability('Bypass de seguridad', () => this.testSecurityBypass())
    await this.testVulnerability('Exposición de datos sensibles', () => this.testSensitiveDataExposure())
    await this.testVulnerability('Path traversal', () => this.testPathTraversal())
    await this.testVulnerability('Validación de entrada', () => this.testInputValidation())
    
    this.generateReport()
  }
}

// Ejecutar las pruebas
async function main() {
  const tester = new RealSecurityTester()
  await tester.runAllTests()
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export default RealSecurityTester
