// Tests para validación de esquemas de seguridad
import { validateAttendanceExport, validateAttendanceTrends } from '../../lib/security/schema-validation'

// Tests para validación de esquemas de seguridad
function testSchemaValidation() {
  console.log('🧪 Ejecutando tests de validación de esquemas...')
  
  // Test 1: Input válido
  console.log('Test 1: Input válido')
  const validInput = {
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    formato: 'excel' as const
  }
  
  const result1 = validateAttendanceExport(validInput)
  console.log('✅ Input válido:', result1.success ? 'PASS' : 'FAIL')
  
  // Test 2: SQL Injection en fechas
  console.log('Test 2: SQL Injection en fechas')
  const maliciousInput = {
    startDate: "2024-01-01'; DROP TABLE attendance_records; --",
    endDate: '2024-01-31',
    formato: 'excel' as const
  }
  
  const result2 = validateAttendanceExport(maliciousInput)
  console.log('✅ SQL Injection bloqueado:', !result2.success ? 'PASS' : 'FAIL')
  
  // Test 3: Formato de archivo inválido
  console.log('Test 3: Formato de archivo inválido')
  const invalidFormat = {
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    formato: 'exe' as any
  }
  
  const result3 = validateAttendanceExport(invalidFormat)
  console.log('✅ Formato inválido bloqueado:', !result3.success ? 'PASS' : 'FAIL')
  
  console.log('🎉 Tests completados')
}

// Ejecutar tests si es llamado directamente
if (typeof window === 'undefined') {
  testSchemaValidation()
}