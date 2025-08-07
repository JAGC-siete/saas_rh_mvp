#!/usr/bin/env node

/**
 * Script para probar el sistema de logging
 * Ejecutar con: node scripts/test-logging.js
 */

// Simular diferentes entornos
const environments = ['development', 'production'];

environments.forEach(env => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Testing in ${env.toUpperCase()} environment`);
  console.log('='.repeat(50));
  
  // Configurar entorno
  process.env.NODE_ENV = env;
  process.env.LOG_LEVEL = env === 'production' ? 'info' : 'debug';
  
  // Limpiar cache de módulos para recargar con nuevo entorno
  delete require.cache[require.resolve('../lib/logger.ts')];
  
  // Importar logger
  const { logger } = require('../lib/logger.ts');
  
  console.log('\n📝 Testing different log levels:\n');
  
  // Probar diferentes niveles
  logger.debug('This is a debug message', { detail: 'debugging info' });
  logger.info('User logged in', { userId: '12345', email: 'user@example.com' });
  logger.warn('API rate limit approaching', { current: 95, limit: 100 });
  logger.error('Database connection failed', new Error('Connection timeout'), { 
    host: 'localhost',
    port: 5432 
  });
  
  console.log('\n🚀 Testing helper methods:\n');
  
  // Probar helpers
  logger.api('POST', '/api/users', 201, 145, { created: 'user-123' });
  logger.db('SELECT', 'employees', 23, { rows: 150 });
  
  console.log('\n📊 Testing performance scenarios:\n');
  
  // Simular operación lenta
  const startTime = Date.now();
  setTimeout(() => {
    const duration = Date.now() - startTime;
    logger.info('Slow operation completed', { duration: `${duration}ms`, operation: 'data_processing' });
  }, 100);
});

// Probar logger del cliente
console.log(`\n${'='.repeat(50)}`);
console.log('Testing CLIENT LOGGER');
console.log('='.repeat(50));

delete require.cache[require.resolve('../lib/logger-client.ts')];
const { clientLogger } = require('../lib/logger-client.ts');

console.log('\n🌐 Testing client logger:\n');

clientLogger.debug('Component mounted', { component: 'PayrollManager' });
clientLogger.info('Form submitted', { formId: 'employee-form' });
clientLogger.track('button_clicked', { button: 'generate-payroll', section: 'payroll' });
clientLogger.performance('api_call', 250, { endpoint: '/api/payroll/calculate' });
clientLogger.performance('api_call', 1500, { endpoint: '/api/reports/generate' }); // Slow
clientLogger.error('Validation failed', new Error('Invalid email format'), { field: 'email' });

console.log('\n✅ Logging test completed!\n');
console.log('Check the output above to verify:');
console.log('1. Different log levels work correctly');
console.log('2. JSON format in production vs readable format in development');
console.log('3. Helper methods provide useful shortcuts');
console.log('4. Error stack traces are included appropriately');
console.log('5. Client logger has appropriate styling in development');