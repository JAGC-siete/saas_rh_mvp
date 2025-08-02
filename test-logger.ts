#!/usr/bin/env tsx

/**
 * Test rápido del sistema de logging
 * Ejecutar con: tsx test-logger.ts
 */

import { logger } from './lib/logger'
import { clientLogger } from './lib/logger-client'

console.log('\n🧪 TESTING LOGGING SYSTEM\n')

// Test 1: Diferentes niveles de log
console.log('1️⃣ Testing log levels:')
console.log('-'.repeat(40))

logger.debug('Debug message', { detail: 'only in dev' })
logger.info('Info message', { userId: '123' })
logger.warn('Warning message', { threshold: 90 })
logger.error('Error message', new Error('Test error'), { context: 'testing' })

// Test 2: API logging
console.log('\n2️⃣ Testing API helpers:')
console.log('-'.repeat(40))

logger.api('GET', '/api/users', 200, 45)
logger.api('POST', '/api/payroll/calculate', 201, 1234, { records: 150 })
logger.api('GET', '/api/reports', 500, 5000, { error: 'timeout' })

// Test 3: Database logging
console.log('\n3️⃣ Testing DB helpers:')
console.log('-'.repeat(40))

logger.db('SELECT', 'employees', 23, { rows: 100 })
logger.db('INSERT', 'attendance_records', 145)
logger.db('UPDATE', 'payroll_records', 2340, { affected: 50 })

// Test 4: Client logger
console.log('\n4️⃣ Testing client logger:')
console.log('-'.repeat(40))

clientLogger.debug('Component rendered')
clientLogger.info('User action', { action: 'click' })
clientLogger.track('form_submitted', { formId: 'payroll' })
clientLogger.performance('api_call', 250)
clientLogger.performance('heavy_operation', 2500) // This will warn
clientLogger.error('Validation failed', new Error('Invalid input'))

// Test 5: Production mode simulation
console.log('\n5️⃣ Testing production mode:')
console.log('-'.repeat(40))

// Temporarily change to production
const originalEnv = process.env.NODE_ENV
process.env.NODE_ENV = 'production'

// Re-import to get production behavior
delete require.cache[require.resolve('./lib/logger')]
const { logger: prodLogger } = require('./lib/logger')

console.log('In production, logs are JSON formatted:')
prodLogger.info('Production log', { 
  user: 'john@example.com',
  action: 'login',
  ip: '192.168.1.1'
})

// Restore environment
process.env.NODE_ENV = originalEnv

// Test 6: Performance test
console.log('\n6️⃣ Performance test:')
console.log('-'.repeat(40))

const iterations = 10000
const start = Date.now()

for (let i = 0; i < iterations; i++) {
  logger.debug('Performance test', { iteration: i })
}

const duration = Date.now() - start
console.log(`✅ Logged ${iterations} messages in ${duration}ms`)
console.log(`📊 Average: ${(duration / iterations).toFixed(3)}ms per log`)

console.log('\n✨ All tests completed!\n')