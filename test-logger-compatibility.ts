#!/usr/bin/env tsx

/**
 * Test de compatibilidad del logger con código Winston
 */

import { 
  logger, 
  logEvent, 
  logError, 
  logAuth, 
  logDatabase, 
  logPayroll,
  requestLogger 
} from './lib/logger'

console.log('\n🔧 TEST DE COMPATIBILIDAD WINSTON\n')

// Test 1: Funciones de compatibilidad
console.log('1️⃣ FUNCIONES DE COMPATIBILIDAD')
console.log('─'.repeat(50))

// logEvent (usado en jobs.ts)
logEvent('info', 'Job started', { jobName: 'payroll-calculation' })
logEvent('error', 'Job failed', { error: 'Database timeout' })

// logError (usado en varios lugares)
logError(new Error('Test error'), { module: 'auth', userId: '123' })

// logAuth
logAuth('login', 'user-123', { method: '2fa', ip: '192.168.1.1' })

// logDatabase
logDatabase('INSERT', 'employees', { rows: 1, duration: '45ms' })

// logPayroll
logPayroll('calculate', 'emp-456', { month: 'January', amount: 5000 })

// Test 2: Método log directo (Winston style)
console.log('\n2️⃣ MÉTODO LOG WINSTON-STYLE')
console.log('─'.repeat(50))

logger.log('info', 'Direct log call')
logger.log('warn', { message: 'Object-style log', code: 'WARN001' })
logger.log('error', 'Error with meta', { stack: 'fake stack trace' })

// Test 3: HTTP logging
console.log('\n3️⃣ HTTP LOGGING')
console.log('─'.repeat(50))

logger.http('GET /api/users', { status: 200, duration: '45ms' })
logger.http('POST /api/payroll', { status: 201, duration: '234ms' })

// Test 4: Request middleware
console.log('\n4️⃣ REQUEST MIDDLEWARE')
console.log('─'.repeat(50))

// Simular request/response
const mockReq = {
  method: 'POST',
  url: '/api/attendance/register',
  headers: { 'user-agent': 'Mozilla/5.0' },
  ip: '192.168.1.100'
}

const mockRes = {
  statusCode: 200,
  on: (event: string, callback: Function) => {
    if (event === 'finish') {
      setTimeout(callback, 10) // Simular respuesta
    }
  }
}

const mockNext = () => console.log('→ Middleware executed successfully')

// Ejecutar middleware
requestLogger(mockReq, mockRes, mockNext)

// Test 5: Verificar que no hay errores con código existente
console.log('\n5️⃣ COMPATIBILIDAD CON CÓDIGO EXISTENTE')
console.log('─'.repeat(50))

try {
  // Simular llamadas del código existente
  logger.info('Payroll calculation started')
  logEvent('info', 'Processing employees', { count: 150 })
  logger.warn('Missing bank info for employee', { employeeId: 'emp-789' })
  logError(new Error('Calculation failed'), { batch: 5 })
  
  console.log('✅ Todas las llamadas de compatibilidad funcionan correctamente')
} catch (error) {
  console.error('❌ Error de compatibilidad:', error)
}

console.log('\n✨ Test de compatibilidad completado!\n')