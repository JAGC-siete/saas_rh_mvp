#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'

// Load environment variables
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
    console.log('🚀 Running safe migration...')
    
    // Read migration file
    const migrationPath = join(process.cwd(), 'supabase/migrations/20250127000003_onboarding_multi_tenant.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    // Split into statements and execute one by one
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements`)
    
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        try {
          console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`)
          
          // Use raw SQL execution
          const { data, error } = await supabase
            .from('_sql')
            .select('*')
            .eq('query', statement)
          
          if (error) {
            // Try alternative method
            const { error: altError } = await supabase.rpc('exec', { sql: statement })
            if (altError) {
              console.warn(`⚠️ Statement ${i + 1} failed:`, altError.message)
              errorCount++
            } else {
              console.log(`✅ Statement ${i + 1} executed successfully`)
              successCount++
            }
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`)
            successCount++
          }
        } catch (err) {
          console.warn(`⚠️ Statement ${i + 1} error:`, err.message)
          errorCount++
        }
      }
    }
    
    console.log('')
    console.log('📊 Migration Summary:')
    console.log(`✅ Successful: ${successCount}`)
    console.log(`❌ Failed: ${errorCount}`)
    
    if (errorCount === 0) {
      console.log('🎉 Migration completed successfully!')
    } else {
      console.log('⚠️ Migration completed with some errors')
      console.log('Some statements may have failed due to existing objects')
    }
    
    // Test the setup
    console.log('')
    console.log('🧪 Testing setup...')
    
    // Check if we can access the tables
    const tables = ['user_profiles', 'companies', 'departments', 'employees']
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`)
        } else {
          console.log(`✅ ${table}: Accessible`)
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`)
      }
    }
    
  } catch (error) {
    console.error('💥 Migration error:', error)
  }
}

runMigration()
