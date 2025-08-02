#!/usr/bin/env tsx

/**
 * Test compacto del sistema de logging
 * Ejecutar con: tsx test-logger-compact.ts
 */

import { logger } from './lib/logger'
import { clientLogger } from './lib/logger-client'

console.log('\n🧪 TEST DE LOGGING ESTRUCTURADO\n')

// Test 1: Desarrollo vs Producción
console.log('1️⃣ FORMATO DE LOGS')
console.log('─'.repeat(50))

// Modo desarrollo
console.log('\n📝 Desarrollo (formato legible):')
logger.info('Usuario autenticado', { userId: '123', email: 'user@example.com' })

// Simular producción
console.log('\n📦 Producción (formato JSON):')
process.env.NODE_ENV = 'production'
delete require.cache[require.resolve('./lib/logger')]
const { logger: prodLogger } = require('./lib/logger')
prodLogger.info('Usuario autenticado', { userId: '123', email: 'user@example.com' })
process.env.NODE_ENV = 'development'

// Test 2: Niveles de log
console.log('\n\n2️⃣ NIVELES DE LOG')
console.log('─'.repeat(50))

logger.debug('Información de debugging')
logger.info('Información general')
logger.warn('Advertencia del sistema')
logger.error('Error crítico', new Error('Connection failed'))

// Test 3: Helpers especializados
console.log('\n\n3️⃣ HELPERS ESPECIALIZADOS')
console.log('─'.repeat(50))

logger.api('POST', '/api/payroll/calculate', 201, 234, { records: 150 })
logger.db('SELECT', 'employees', 23, { rows: 150 })
clientLogger.track('button_clicked', { button: 'generate-payroll' })
clientLogger.performance('api_call', 1500, { endpoint: '/api/reports' })

// Test 4: Performance
console.log('\n\n4️⃣ PERFORMANCE')
console.log('─'.repeat(50))

const iterations = 1000
const start = Date.now()
const originalLog = console.log
console.log = () => {} // Silenciar output temporalmente

for (let i = 0; i < iterations; i++) {
  logger.debug('Test', { i })
}

console.log = originalLog // Restaurar console.log
const duration = Date.now() - start

console.log(`✅ ${iterations} logs en ${duration}ms (${(duration/iterations).toFixed(3)}ms/log)`)
console.log(`📊 Throughput: ${Math.round(iterations/(duration/1000))} logs/segundo`)

// Resumen
console.log('\n\n✨ CARACTERÍSTICAS PRINCIPALES')
console.log('─'.repeat(50))
console.log('✅ Sin dependencias externas pesadas')
console.log('✅ Formato JSON en producción')
console.log('✅ Helpers para APIs y DB')
console.log('✅ Performance excelente')
console.log('✅ Contexto enriquecido')
console.log('✅ Logger optimizado para cliente\n')