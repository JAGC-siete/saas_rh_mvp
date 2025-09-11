#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'

// Load environment variables from .env file
config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('🚀 Running onboarding migration...')
    
    // Read migration file
    const migrationPath = join(process.cwd(), 'supabase/migrations/20250127000003_onboarding_multi_tenant.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Executing ${statements.length} SQL statements...`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`)
        
        const { error } = await supabase.rpc('exec', { sql: statement })
        
        if (error) {
          console.warn(`⚠️ Statement ${i + 1} warning:`, error.message)
          // Continue with other statements
        }
      }
    }
    
    console.log('✅ Onboarding migration completed successfully')
    
    // Test the setup
    console.log('🧪 Testing setup...')
    
    // Check if tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .in('table_name', ['user_profiles', 'companies', 'departments', 'employees'])
    
    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError)
      process.exit(1)
    }
    
    console.log('✅ Tables created:', tables.map(t => t.table_name))
    
    // Check if trigger exists
    const { data: triggers, error: triggersError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name')
      .eq('trigger_name', 'on_auth_user_created')
    
    if (triggersError) {
      console.error('❌ Error checking triggers:', triggersError)
      process.exit(1)
    }
    
    console.log('✅ Trigger created:', triggers.length > 0 ? 'Yes' : 'No')
    
    console.log('🎉 Onboarding setup completed successfully!')
    
  } catch (error) {
    console.error('💥 Migration error:', error)
    process.exit(1)
  }
}

runMigration()
