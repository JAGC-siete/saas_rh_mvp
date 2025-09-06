#!/usr/bin/env node

/**
 * TEST ESPECÍFICO: VULNERABILIDADES IDENTIFICADAS EN EL CÓDIGO
 * 
 * Basado en el análisis del código, estas son las vulnerabilidades específicas encontradas:
 * 1. Filtrado de empresa inconsistente entre endpoints
 * 2. Validación de fechas insuficiente
 * 3. Exposición de información sensible en logs
 * 4. Bypass de autenticación en algunos endpoints
 * 5. Falta de rate limiting
 */

import fetch from 'node-fetch'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://humanosisu.net'

class SpecificVulnerabilityTester {
  constructor() {
    this.results = []
  }

  // VULNERABILIDAD 1: Filtrado de empresa inconsistente
  async testCompanyFilteringInconsistency() {
    console.log('🔍 Probando inconsistencia en filtrado de empresa...')
    
    // Test 1: Comparar comportamiento entre /api/attendance/export y /api/reports/export-attendance
    const endpoints = [
      '/api/attendance/export',
      '/api/reports/export-attendance'
    ]
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token'
          },
          body: JSON.stringify({
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            formato: 'excel'
          })
        })
        
        const responseText = await response.text()
        
        // Verificar si el endpoint aplica filtrado de empresa correctamente
        if (responseText.includes('company_id') || responseText.includes('employees.company_id')) {
          this.results.push({
            type: 'COMPANY_FILTERING_INCONSISTENCY',
            endpoint,
            severity: 'HIGH',
            description: `Filtrado de empresa inconsistente en ${endpoint}`,
            details: 'El endpoint puede no estar aplicando filtros de empresa correctamente'
          })
        }
      } catch (error) {
        console.error(`Error en test de filtrado de empresa para ${endpoint}:`, error.message)
      }
    }
  }

  // VULNERABILIDAD 2: Validación de fechas insuficiente
  async testDateValidationWeakness() {
    console.log('🔍 Probando debilidades en validación de fechas...')
    
    const maliciousDates = [
      '2024-13-01', // Mes inválido
      '2024-02-30', // Día inválido
      '2024/01/01', // Formato incorrecto
      '01-01-2024', // Formato incorrecto
      '2024-01-01T00:00:00Z', // Con timestamp
      '2024-01-01 00:00:00', // Con hora
      '2024-01-01 23:59:59.999', // Con milisegundos
      '2024-01-01+00:00', // Con timezone
      '2024-01-01T00:00:00.000Z', // ISO completo
      '2024-01-01T00:00:00.000+00:00' // ISO con timezone
    ]
    
    const endpoints = [
      '/api/attendance/export',
      '/api/reports/export-attendance',
      '/api/reports/attendance-trends'
    ]
    
    for (const endpoint of endpoints) {
      for (const maliciousDate of maliciousDates) {
        try {
          const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test_token'
            },
            body: JSON.stringify({
              startDate: maliciousDate,
              endDate: '2024-01-31',
              formato: 'excel'
            })
          })
          
          const responseText = await response.text()
          
          // Si la respuesta no es un error 400, la validación es débil
          if (response.status !== 400 && !responseText.includes('error')) {
            this.results.push({
              type: 'DATE_VALIDATION_WEAKNESS',
              endpoint,
              payload: maliciousDate,
              severity: 'MEDIUM',
              description: `Validación de fecha débil en ${endpoint}`,
              details: `Fecha maliciosa aceptada: ${maliciousDate}`
            })
          }
        } catch (error) {
          console.error(`Error en test de validación de fecha para ${endpoint}:`, error.message)
        }
      }
    }
  }

  // VULNERABILIDAD 3: Exposición de información sensible en logs
  async testSensitiveDataInLogs() {
    console.log('🔍 Probando exposición de información sensible en logs...')
    
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
            'Authorization': 'Bearer test_token'
          },
          body: JSON.stringify({
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            formato: 'excel'
          })
        })
        
        const responseText = await response.text()
        
        // Verificar si se expone información sensible en la respuesta
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
              type: 'SENSITIVE_DATA_IN_LOGS',
              endpoint,
              pattern: pattern.toString(),
              severity: 'HIGH',
              description: `Información sensible expuesta en logs de ${endpoint}`,
              details: `Patrón encontrado: ${pattern.toString()}`
            })
          }
        }
      } catch (error) {
        console.error(`Error en test de logs sensibles para ${endpoint}:`, error.message)
      }
    }
  }

  // VULNERABILIDAD 4: Bypass de autenticación
  async testAuthenticationBypass() {
    console.log('🔍 Probando bypass de autenticación...')
    
    const bypassAttempts = [
      { name: 'Sin Authorization header', headers: {} },
      { name: 'Authorization vacío', headers: { 'Authorization': '' } },
      { name: 'Authorization malformado', headers: { 'Authorization': 'Bearer' } },
      { name: 'Authorization con espacios', headers: { 'Authorization': ' Bearer ' } },
      { name: 'Authorization con caracteres especiales', headers: { 'Authorization': 'Bearer test@#$%' } },
      { name: 'Authorization con SQL injection', headers: { 'Authorization': "Bearer ' OR '1'='1" } },
      { name: 'Authorization con XSS', headers: { 'Authorization': 'Bearer <script>alert(1)</script>' } },
      { name: 'Authorization con path traversal', headers: { 'Authorization': 'Bearer ../../../etc/passwd' } }
    ]
    
    const endpoints = [
      '/api/attendance/export',
      '/api/reports/export-attendance',
      '/api/reports/attendance-trends'
    ]
    
    for (const endpoint of endpoints) {
      for (const attempt of bypassAttempts) {
        try {
          const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...attempt.headers
            },
            body: JSON.stringify({
              startDate: '2024-01-01',
              endDate: '2024-01-31',
              formato: 'excel'
            })
          })
          
          // Si la respuesta es 200, el bypass fue exitoso
          if (response.status === 200) {
            this.results.push({
              type: 'AUTHENTICATION_BYPASS',
              endpoint,
              attempt: attempt.name,
              severity: 'CRITICAL',
              description: `Bypass de autenticación exitoso en ${endpoint}`,
              details: `Método: ${attempt.name}`
            })
          }
        } catch (error) {
          console.error(`Error en test de bypass de autenticación para ${endpoint}:`, error.message)
        }
      }
    }
  }

  // VULNERABILIDAD 5: Falta de rate limiting
  async testRateLimitingAbsence() {
    console.log('🔍 Probando ausencia de rate limiting...')
    
    const endpoint = '/api/attendance/export'
    const requests = []
    
    // Enviar 100 requests rápidamente
    for (let i = 0; i < 100; i++) {
      requests.push(
        fetch(`${BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token'
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
      
      // Contar respuestas exitosas
      const successfulResponses = responses.filter(r => r.status === 200).length
      
      if (successfulResponses > 50) { // Si más de 50 requests son exitosos, no hay rate limiting
        this.results.push({
          type: 'RATE_LIMITING_ABSENCE',
          endpoint,
          severity: 'MEDIUM',
          description: `Falta de rate limiting en ${endpoint}`,
          details: `${successfulResponses} de 100 requests fueron exitosos sin rate limiting`
        })
      }
    } catch (error) {
      console.error('Error en test de rate limiting:', error.message)
    }
  }

  // VULNERABILIDAD 6: Inyección SQL en parámetros
  async testSQLInjectionInParameters() {
    console.log('🔍 Probando inyección SQL en parámetros...')
    
    const sqlPayloads = [
      "'; DROP TABLE attendance_records; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM user_profiles --",
      "'; INSERT INTO attendance_records VALUES ('hacked', '2024-01-01', 'present', NOW(), NOW(), 0, 'hacked', 'hacked', 'hacked', 'hacked', 'hacked', 'hacked', NOW(), NOW()); --",
      "' AND (SELECT COUNT(*) FROM user_profiles) > 0 --",
      "1' OR '1'='1",
      "1' UNION SELECT * FROM user_profiles --",
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
              'Authorization': 'Bearer test_token'
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
              type: 'SQL_INJECTION_IN_PARAMETERS',
              endpoint,
              payload,
              severity: 'CRITICAL',
              description: `Inyección SQL exitosa en parámetros de ${endpoint}`,
              details: `Payload: ${payload}`
            })
          }
        } catch (error) {
          console.error(`Error en test de inyección SQL para ${endpoint}:`, error.message)
        }
      }
    }
  }

  // VULNERABILIDAD 7: Exposición de datos de otras empresas
  async testCrossCompanyDataAccess() {
    console.log('🔍 Probando acceso a datos de otras empresas...')
    
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
            'Authorization': 'Bearer test_token'
          },
          body: JSON.stringify({
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            formato: 'excel',
            company_id: '00000000-0000-0000-0000-000000000002' // ID de otra empresa
          })
        })
        
        const responseText = await response.text()
        
        // Verificar si se devuelven datos de otra empresa
        if (responseText.includes('company_id') || responseText.includes('employees')) {
          this.results.push({
            type: 'CROSS_COMPANY_DATA_ACCESS',
            endpoint,
            severity: 'CRITICAL',
            description: `Acceso a datos de otras empresas en ${endpoint}`,
            details: 'El endpoint puede estar devolviendo datos de empresas no autorizadas'
          })
        }
      } catch (error) {
        console.error(`Error en test de acceso cross-company para ${endpoint}:`, error.message)
      }
    }
  }

  // Generar reporte
  generateReport() {
    console.log('\n' + '='.repeat(80))
    console.log('📊 REPORTE DE VULNERABILIDADES ESPECÍFICAS - SISTEMA DE EXPORTACIÓN DE ASISTENCIA')
    console.log('='.repeat(80))
    
    console.log('\n🔴 VULNERABILIDADES ESPECÍFICAS ENCONTRADAS:')
    console.log('-'.repeat(50))
    
    if (this.results.length === 0) {
      console.log('✅ No se encontraron vulnerabilidades específicas')
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
    
    console.log('\n🛡️ RECOMENDACIONES ESPECÍFICAS:')
    console.log('-'.repeat(50))
    console.log('1. Implementar validación estricta de fechas con regex y librerías de validación')
    console.log('2. Aplicar filtros de empresa consistentes en todos los endpoints')
    console.log('3. Implementar rate limiting con Redis o similar')
    console.log('4. Sanitizar todos los logs para evitar exposición de información sensible')
    console.log('5. Implementar Row Level Security (RLS) en Supabase')
    console.log('6. Validar y sanitizar todos los parámetros de entrada')
    console.log('7. Implementar monitoreo de seguridad en tiempo real')
    console.log('8. Aplicar principios de menor privilegio en la autenticación')
    
    console.log('\n' + '='.repeat(80))
  }

  // Ejecutar todas las pruebas
  async runAllTests() {
    console.log('🚀 Iniciando pruebas de vulnerabilidades específicas...')
    
    await this.testCompanyFilteringInconsistency()
    await this.testDateValidationWeakness()
    await this.testSensitiveDataInLogs()
    await this.testAuthenticationBypass()
    await this.testRateLimitingAbsence()
    await this.testSQLInjectionInParameters()
    await this.testCrossCompanyDataAccess()
    
    this.generateReport()
  }
}

// Ejecutar las pruebas
async function main() {
  const tester = new SpecificVulnerabilityTester()
  await tester.runAllTests()
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export default SpecificVulnerabilityTester
