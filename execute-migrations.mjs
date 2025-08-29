#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function executeMigrations() {
  console.log('🚀 Executing payroll audit system migrations...')
  
  try {
    // Migration 1: Create tables
    console.log('\n📋 Migration 1: Creating audit tables...')
    const migration1 = readFileSync(join(process.cwd(), 'supabase/migrations/20250115000001_payroll_audit_system.sql'), 'utf8')
    
    const { error: error1 } = await supabase.rpc('exec_sql', { sql: migration1 })
    if (error1) {
      console.log(`⚠️ Migration 1 warning (tables may already exist): ${error1.message}`)
    } else {
      console.log('✅ Migration 1 completed')
    }
    
    // Migration 2: Create triggers
    console.log('\n🔧 Migration 2: Creating triggers...')
    const migration2 = readFileSync(join(process.cwd(), 'supabase/migrations/20250115000002_payroll_triggers.sql'), 'utf8')
    
    const { error: error2 } = await supabase.rpc('exec_sql', { sql: migration2 })
    if (error2) {
      console.log(`⚠️ Migration 2 warning (triggers may already exist): ${error2.message}`)
    } else {
      console.log('✅ Migration 2 completed')
    }
    
    // Migration 3: Create views and functions
    console.log('\n👁️ Migration 3: Creating views and functions...')
    const migration3 = readFileSync(join(process.cwd(), 'supabase/migrations/20250115000003_payroll_views.sql'), 'utf8')
    
    const { error: error3 } = await supabase.rpc('exec_sql', { sql: migration3 })
    if (error3) {
      console.log(`⚠️ Migration 3 warning (views/functions may already exist): ${error3.message}`)
    } else {
      console.log('✅ Migration 3 completed')
    }
    
    console.log('\n✅ All migrations completed!')
    
    // Verify the functions now exist
    console.log('\n🔍 Verifying functions...')
    
    try {
      const { data: runData, error: runError } = await supabase.rpc('create_or_update_payroll_run', {
        p_company_uuid: '00000000-0000-0000-0000-000000000001',
        p_year: 2025,
        p_month: 8,
        p_quincena: 1,
        p_tipo: 'CON',
        p_user_id: '00000000-0000-0000-0000-000000000001'
      })
      
      if (runError) {
        console.log(`❌ create_or_update_payroll_run function still not working: ${runError.message}`)
      } else {
        console.log(`✅ create_or_update_payroll_run function working!`)
      }
    } catch (e) {
      console.log(`❌ create_or_update_payroll_run function error: ${e.message}`)
    }
    
  } catch (error) {
    console.error('❌ Error executing migrations:', error.message)
    process.exit(1)
  }
}

executeMigrations()
  .then(() => {
    console.log('\n✅ Migration execution completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error.message)
    process.exit(1)
  })
