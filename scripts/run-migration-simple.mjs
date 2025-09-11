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
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTables() {
  console.log('🚀 Creating tables and policies...')
  
  try {
    // Create user_profiles table
    console.log('📝 Creating user_profiles table...')
    const { error: profilesError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1)
    
    if (profilesError && profilesError.code === 'PGRST116') {
      console.log('Creating user_profiles table...')
      // Table doesn't exist, we need to create it via SQL
      console.log('⚠️ user_profiles table needs to be created via Supabase dashboard')
    }

    // Create companies table
    console.log('📝 Creating companies table...')
    const { error: companiesError } = await supabase
      .from('companies')
      .select('id')
      .limit(1)
    
    if (companiesError && companiesError.code === 'PGRST116') {
      console.log('⚠️ companies table needs to be created via Supabase dashboard')
    }

    // Create departments table
    console.log('📝 Creating departments table...')
    const { error: deptError } = await supabase
      .from('departments')
      .select('id')
      .limit(1)
    
    if (deptError && deptError.code === 'PGRST116') {
      console.log('⚠️ departments table needs to be created via Supabase dashboard')
    }

    // Create employees table
    console.log('📝 Creating employees table...')
    const { error: empError } = await supabase
      .from('employees')
      .select('id')
      .limit(1)
    
    if (empError && empError.code === 'PGRST116') {
      console.log('⚠️ employees table needs to be created via Supabase dashboard')
    }

    console.log('✅ Tables check completed')
    console.log('')
    console.log('📋 NEXT STEPS:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy and paste the content from: supabase/migrations/20250127000003_onboarding_multi_tenant.sql')
    console.log('4. Execute the SQL script')
    console.log('5. Run this script again to verify setup')
    
  } catch (error) {
    console.error('💥 Error:', error)
  }
}

createTables()
