#!/usr/bin/env node

/**
 * Script para aplicar migraciones de base de datos
 * Ejecuta: node scripts/migrate-database.js
 */

const fs = require('fs')
const path = require('path')

console.log('🗄️  Applying database migrations...')

// Lista de migraciones en orden
const migrations = [
  '20250110000001_create_payroll_run_tables.sql',
  '20250110000002_create_payroll_functions.sql',
  '20250110000004_create_payroll_run_function.sql',
  '20250110000005_create_notification_configs.sql',
  '20250110000006_create_payroll_rules_tables.sql'
]

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')

console.log('📋 Migration plan:')
migrations.forEach((migration, index) => {
  const migrationPath = path.join(migrationsDir, migration)
  const exists = fs.existsSync(migrationPath)
  console.log(`  ${index + 1}. ${migration} ${exists ? '✅' : '❌'}`)
})

console.log('\n⚠️  IMPORTANT: These migrations must be applied manually in Supabase Dashboard:')
console.log('   1. Go to https://supabase.com/dashboard')
console.log('   2. Navigate to your project')
console.log('   3. Go to SQL Editor')
console.log('   4. Copy and paste each migration file content')
console.log('   5. Execute them in order')

console.log('\n🔍 Migration files location:')
console.log(`   ${migrationsDir}`)

console.log('\n📝 Next steps:')
console.log('   1. Apply migrations manually in Supabase Dashboard')
console.log('   2. Verify tables exist: ihss_rules, rap_rules, isr_brackets')
console.log('   3. Test payroll calculation engine')
console.log('   4. Deploy v1 API routes')

process.exit(0)
