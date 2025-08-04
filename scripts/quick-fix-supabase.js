#!/usr/bin/env node

/**
 * Script de corrección rápida para Supabase
 * Ejecutar después de corregir la migración
 */

const { execSync } = require('child_process');

console.log('🚀 Aplicando correcciones a Supabase...');

try {
  // Resetear migraciones
  console.log('🔄 Reseteando migraciones...');
  execSync('supabase db reset', { stdio: 'inherit' });
  
  // Aplicar migraciones corregidas
  console.log('📦 Aplicando migraciones...');
  execSync('supabase db push', { stdio: 'inherit' });
  
  console.log('✅ Corrección completada exitosamente');
  
} catch (error) {
  console.error('❌ Error durante la corrección:', error.message);
  process.exit(1);
}
