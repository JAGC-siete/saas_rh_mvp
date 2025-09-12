#!/usr/bin/env node

/**
 * Script para generar tipos TypeScript desde Supabase
 * Ejecuta: node scripts/generate-supabase-types.js
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🗄️  Generating Supabase database types...')

try {
  // Verificar que existe supabase config
  const supabaseConfigPath = path.join(process.cwd(), 'supabase', 'config.toml')
  if (!fs.existsSync(supabaseConfigPath)) {
    throw new Error('supabase/config.toml not found')
  }

  // Crear directorio lib/supabase si no existe
  const supabaseDir = path.join(process.cwd(), 'lib', 'supabase')
  if (!fs.existsSync(supabaseDir)) {
    fs.mkdirSync(supabaseDir, { recursive: true })
  }

  // Generar tipos desde Supabase
  const outputPath = path.join(supabaseDir, 'database.types.ts')
  
  try {
    execSync(`npx supabase gen types typescript --local > ${outputPath}`, {
      stdio: 'inherit',
      cwd: process.cwd()
    })
  } catch (error) {
    console.warn('⚠️  Local Supabase not available, trying with project reference...')
    
    // Fallback: generar desde proyecto remoto (requiere SUPABASE_PROJECT_REF)
    const projectRef = process.env.SUPABASE_PROJECT_REF
    if (!projectRef) {
      throw new Error('SUPABASE_PROJECT_REF environment variable not set')
    }
    
    execSync(`npx supabase gen types typescript --project-id ${projectRef} > ${outputPath}`, {
      stdio: 'inherit',
      cwd: process.cwd()
    })
  }

  console.log('✅ Supabase database types generated successfully!')
  console.log(`📁 Output: ${outputPath}`)

  // Verificar que el archivo se generó correctamente
  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath)
    console.log(`📊 File size: ${stats.size} bytes`)
    
    // Verificar que contiene tipos esperados
    const content = fs.readFileSync(outputPath, 'utf-8')
    if (content.includes('payroll_runs') && content.includes('payroll_run_lines')) {
      console.log('✅ Payroll types found in generated file')
    } else {
      console.warn('⚠️  Payroll types not found - check migration status')
    }
  }

  // Actualizar lib/supabase.ts para usar tipos generados
  const supabaseClientPath = path.join(process.cwd(), 'lib', 'supabase.ts')
  if (fs.existsSync(supabaseClientPath)) {
    const clientContent = fs.readFileSync(supabaseClientPath, 'utf-8')
    
    if (!clientContent.includes('Database')) {
      console.log('📝 Updating lib/supabase.ts to use generated types...')
      
      const updatedContent = clientContent.replace(
        /import.*from.*@supabase\/supabase-js/,
        `import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from './supabase/database.types'`
      ).replace(
        /export const supabase = createClient/,
        `export const supabase: SupabaseClient<Database> = createClient`
      )
      
      fs.writeFileSync(supabaseClientPath, updatedContent)
      console.log('✅ Updated lib/supabase.ts with generated types')
    }
  }

} catch (error) {
  console.error('❌ Error generating Supabase types:', error.message)
  
  if (error.message.includes('SUPABASE_PROJECT_REF')) {
    console.log('\n💡 To fix this:')
    console.log('   1. Get your project reference from Supabase dashboard')
    console.log('   2. Set environment variable: export SUPABASE_PROJECT_REF=your-project-ref')
    console.log('   3. Run the script again')
  }
  
  process.exit(1)
}
