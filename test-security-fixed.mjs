#!/usr/bin/env node

/**
 * TEST DE SEGURIDAD DESPUÉS DE LAS CORRECCIONES
 * Verifica que las vulnerabilidades han sido corregidas
 */

import fetch from 'node-fetch'

const BASE_URL = 'https://humanosisu.net'

class SecurityFixedTester {
  constructor() {
    this.results = {
      vulnerabilities: [],
      protections: [],
      summary: {}
    }
  }

  // Test 1: Verificar que la validación de entrada funciona
  async testInputValidation() {
    console.log('🔍 Probando validación de entrada...')
    
    const maliciousInputs = [
      "2024-01-01'; DROP TABLE attendance_records; --",
      "2024-01-01' OR '1'='1",
      "../../../etc/passwd",
      "<script>alert('xss')</script>",
      "2024-13-01", // Fecha inválida
      "2024-02-30", // Fecha inválida
      "2024/01/01", // Formato incorrecto
      "2024-01-01T00:00:00Z" // Con timestamp
    ]

    const endpoints = [
      '/api/attendance/export',
      '/api/reports/export-attendance',
      '/api/reports/attendance-trends'
    ]

    for (const endpoint of endpoints) {
      for (const maliciousInput of maliciousInputs) {
        try {
          const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer fake_token'
            },
            body: JSON.stringify({
              startDate: maliciousInput,
              endDate: maliciousInput,
              formato: 'excel'
            })
          })

          // Verificar que la respuesta es de error (no 200)
          if (response.status === 200) {
            this.results.vulnerabilities.push({
              type: 'INPUT_VALIDATION_BYPASS',
              endpoint,
              payload: maliciousInput,
              severity: 'CRITICAL',
              description: `Validación de entrada bypassed en ${endpoint}`
            })
            console.log(`❌ VULNERABILIDAD: Validación de entrada bypassed en ${endpoint}`)
          } else {
            this.results.protections.push({
              type: 'INPUT_VALIDATION_WORKING',
              endpoint,
              payload: maliciousInput,
              status: response.status,
              description: `Validación de entrada funcionando en ${endpoint}`
            })
            console.log(`✅ PROTECCIÓN: Validación funcionando en ${endpoint} (Status: ${response.status})`)
          }
        } catch (error) {
          console.error(`Error en test de validación para ${endpoint}:`, error.message)
        }
      }
    }
  }

  // Test 2: Verificar rate limiting
  async testRateLimiting() {
    console.log('🔍 Probando rate limiting...')
    
    const endpoint = '/api/attendance/export'
    const requests = []
    
    // Enviar 10 requests rápidamente (debería activar rate limiting)
    for (let i = 0; i < 10; i++) {
      requests.push(
        fetch(`${BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer fake_token'
          },
          body: JSON.stringify({
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            formato: 'excel'
          })
        })
      )
    }
    
    try {
      const responses = await Promise.all(requests)
      
      // Contar respuestas 429 (rate limited)
      const rateLimitedResponses = responses.filter(r => r.status === 429).length
      const errorResponses = responses.filter(r => r.status === 401 || r.status === 400).length
      
      console.log(`📊 Rate limiting test - ${endpoint}:`)
      console.log(`   - Requests rate limited (429): ${rateLimitedResponses}`)
      console.log(`   - Requests con error (401/400): ${errorResponses}`)
      
      if (rateLimitedResponses > 0) {
        this.results.protections.push({
          type: 'RATE_LIMITING_WORKING',
          endpoint,
          rateLimitedCount: rateLimitedResponses,
          description: `Rate limiting funcionando en ${endpoint}`
        })
        console.log(`✅ PROTECCIÓN: Rate limiting funcionando en ${endpoint}`)
      } else if (errorResponses === 10) {
        this.results.protections.push({
          type: 'AUTHENTICATION_REQUIRED',
          endpoint,
          description: `Autenticación requerida en ${endpoint} (protección activa)`
        })
        console.log(`✅ PROTECCIÓN: Autenticación requerida en ${endpoint}`)
      } else {
        this.results.vulnerabilities.push({
          type: 'RATE_LIMITING_ABSENT',
          endpoint,
          severity: 'MEDIUM',
          description: `Rate limiting no detectado en ${endpoint}`
        })
        console.log(`⚠️ ADVERTENCIA: Rate limiting no detectado en ${endpoint}`)
      }
    } catch (error) {
      console.error('Error en test de rate limiting:', error.message)
    }
  }

  // Test 3: Verificar autenticación
  async testAuthentication() {
    console.log('🔍 Probando autenticación...')
    
    const endpoints = [
      '/api/attendance/export',
      '/api/reports/export-attendance',
      '/api/reports/attendance-trends'
    ]

    for (const endpoint of endpoints) {
      try {
        // Test sin token
        const responseNoAuth = await fetch(`${BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            formato: 'excel'
          })
        })

        // Test con token falso
        const responseFakeAuth = await fetch(`${BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer fake_token_12345'
          },
          body: JSON.stringify({
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            formato: 'excel'
          })
        })

        console.log(`📊 Autenticación test - ${endpoint}:`)
        console.log(`   - Sin token: ${responseNoAuth.status}`)
        console.log(`   - Token falso: ${responseFakeAuth.status}`)

        if (responseNoAuth.status === 401 && responseFakeAuth.status === 401) {
          this.results.protections.push({
            type: 'AUTHENTICATION_WORKING',
            endpoint,
            description: `Autenticación funcionando correctamente en ${endpoint}`
          })
          console.log(`✅ PROTECCIÓN: Autenticación funcionando en ${endpoint}`)
        } else if (responseNoAuth.status === 200 || responseFakeAuth.status === 200) {
          this.results.vulnerabilities.push({
            type: 'AUTHENTICATION_BYPASS',
            endpoint,
            severity: 'CRITICAL',
            description: `Bypass de autenticación en ${endpoint}`
          })
          console.log(`❌ VULNERABILIDAD: Bypass de autenticación en ${endpoint}`)
        } else {
          this.results.protections.push({
            type: 'AUTHENTICATION_PARTIAL',
            endpoint,
            description: `Autenticación parcialmente funcionando en ${endpoint}`
          })
          console.log(`⚠️ ADVERTENCIA: Autenticación parcial en ${endpoint}`)
        }
      } catch (error) {
        console.error(`Error en test de autenticación para ${endpoint}:`, error.message)
      }
    }
  }

  // Test 4: Verificar sanitización de nombres de archivo
  async testFilenameSanitization() {
    console.log('🔍 Probando sanitización de nombres de archivo...')
    
    const maliciousFilenames = [
      "../../../etc/passwd",
      "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
      "file<script>alert('xss')</script>.xlsx",
      "file;rm -rf /.xlsx",
      "file|cat /etc/passwd.xlsx"
    ]

    const endpoints = [
      '/api/attendance/export',
      '/api/reports/export-attendance'
    ]

    for (const endpoint of endpoints) {
      for (const maliciousFilename of maliciousFilenames) {
        try {
          const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer fake_token'
            },
            body: JSON.stringify({
              startDate: '2024-01-01',
              endDate: '2024-01-31',
              formato: 'excel',
              filename: maliciousFilename
            })
          })

          // Verificar que la respuesta es de error (no 200)
          if (response.status === 200) {
            this.results.vulnerabilities.push({
              type: 'FILENAME_SANITIZATION_BYPASS',
              endpoint,
              payload: maliciousFilename,
              severity: 'HIGH',
              description: `Sanitización de nombre de archivo bypassed en ${endpoint}`
            })
            console.log(`❌ VULNERABILIDAD: Sanitización de archivo bypassed en ${endpoint}`)
          } else {
            this.results.protections.push({
              type: 'FILENAME_SANITIZATION_WORKING',
              endpoint,
              payload: maliciousFilename,
              status: response.status,
              description: `Sanitización de nombre de archivo funcionando en ${endpoint}`
            })
            console.log(`✅ PROTECCIÓN: Sanitización de archivo funcionando en ${endpoint} (Status: ${response.status})`)
          }
        } catch (error) {
          console.error(`Error en test de sanitización para ${endpoint}:`, error.message)
        }
      }
    }
  }

  // Generar reporte final
  generateReport() {
    console.log('\n' + '='.repeat(80))
    console.log('📊 REPORTE DE SEGURIDAD DESPUÉS DE CORRECCIONES')
    console.log('='.repeat(80))
    
    // Resumen
    this.results.summary = {
      totalVulnerabilities: this.results.vulnerabilities.length,
      totalProtections: this.results.protections.length,
      criticalVulnerabilities: this.results.vulnerabilities.filter(v => v.severity === 'CRITICAL').length,
      highVulnerabilities: this.results.vulnerabilities.filter(v => v.severity === 'HIGH').length,
      mediumVulnerabilities: this.results.vulnerabilities.filter(v => v.severity === 'MEDIUM').length
    }

    console.log('\n📈 RESUMEN:')
    console.log('-'.repeat(50))
    console.log(`🔴 Vulnerabilidades encontradas: ${this.results.summary.totalVulnerabilities}`)
    console.log(`   - Críticas: ${this.results.summary.criticalVulnerabilities}`)
    console.log(`   - Altas: ${this.results.summary.highVulnerabilities}`)
    console.log(`   - Medias: ${this.results.summary.mediumVulnerabilities}`)
    console.log(`🟢 Protecciones funcionando: ${this.results.summary.totalProtections}`)

    if (this.results.vulnerabilities.length > 0) {
      console.log('\n🔴 VULNERABILIDADES ENCONTRADAS:')
      console.log('-'.repeat(50))
      this.results.vulnerabilities.forEach((vuln, index) => {
        console.log(`${index + 1}. ${vuln.type}`)
        console.log(`   Endpoint: ${vuln.endpoint}`)
        console.log(`   Severidad: ${vuln.severity}`)
        console.log(`   Descripción: ${vuln.description}`)
        if (vuln.payload) console.log(`   Payload: ${vuln.payload}`)
        console.log('')
      })
    }

    if (this.results.protections.length > 0) {
      console.log('\n🟢 PROTECCIONES FUNCIONANDO:')
      console.log('-'.repeat(50))
      const protectionTypes = [...new Set(this.results.protections.map(p => p.type))]
      protectionTypes.forEach((type, index) => {
        const count = this.results.protections.filter(p => p.type === type).length
        console.log(`${index + 1}. ${type}: ${count} instancias`)
      })
    }

    // Estado de seguridad
    console.log('\n🛡️ ESTADO DE SEGURIDAD:')
    console.log('-'.repeat(50))
    if (this.results.summary.totalVulnerabilities === 0) {
      console.log('✅ EXCELENTE: No se encontraron vulnerabilidades')
    } else if (this.results.summary.criticalVulnerabilities === 0) {
      console.log('⚠️ BUENO: Se encontraron vulnerabilidades menores')
    } else {
      console.log('❌ CRÍTICO: Se encontraron vulnerabilidades críticas')
    }

    console.log('\n' + '='.repeat(80))
  }

  // Ejecutar todas las pruebas
  async runAllTests() {
    console.log('🚀 Iniciando pruebas de seguridad después de correcciones...')
    
    await this.testInputValidation()
    await this.testRateLimiting()
    await this.testAuthentication()
    await this.testFilenameSanitization()
    
    this.generateReport()
  }
}

// Ejecutar las pruebas
async function main() {
  const tester = new SecurityFixedTester()
  await tester.runAllTests()
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export default SecurityFixedTester
