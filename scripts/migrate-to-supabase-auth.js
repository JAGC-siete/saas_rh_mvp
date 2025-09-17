#!/usr/bin/env node

/**
 * Migration Script: Employee Portal to Supabase Auth
 * 
 * This script migrates the existing custom employee authentication system
 * to use Supabase Auth with synthetic users.
 * 
 * Strategy:
 * 1. Create auth.users entries for each employee with portal access
 * 2. Use synthetic emails: {last5}@paragon.employee.local
 * 3. Reuse existing PIN hashes as passwords
 * 4. Update employees.metadata to link auth_user_id
 * 5. Create user_profiles entries for RLS integration
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const COMPANY_ID = '00000000-0000-0000-0000-000000000001' // Paragon

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function migrateEmployeesToSupabaseAuth() {
  try {
    console.log('🚀 Starting migration to Supabase Auth...')
    
    // Step 1: Get all Paragon employees with PIN access
    console.log('📋 Fetching employees with portal access...')
    
    const { data: employees, error: fetchError } = await supabase
      .from('employees')
      .select('id, dni, name, role, company_id, employee_pin_hash, metadata')
      .eq('company_id', COMPANY_ID)
      .eq('status', 'active')
      .not('employee_pin_hash', 'is', null)
    
    if (fetchError) {
      throw new Error(`Failed to fetch employees: ${fetchError.message}`)
    }
    
    console.log(`✅ Found ${employees.length} employees with portal access`)
    
    // Step 2: Create synthetic users for each employee
    const migrationResults = []
    
    for (const emp of employees) {
      try {
        // Skip if already migrated
        if (emp.metadata?.auth_user_id) {
          console.log(`⏭️  Employee ${emp.name} already migrated`)
          migrationResults.push({ employee: emp.name, status: 'skipped', reason: 'already_migrated' })
          continue
        }
        
        const last5 = emp.dni.slice(-5)
        const syntheticEmail = `${last5}@paragon.employee.local`
        
        console.log(`👤 Migrating ${emp.name} (${syntheticEmail})...`)
        
        // Create auth user using Admin API
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: syntheticEmail,
          password: `temp_${last5}_${Date.now()}`, // Temporary password, will be updated
          email_confirm: true,
          user_metadata: {
            employee_id: emp.id,
            dni_last5: last5,
            is_employee_portal: true,
            company_id: emp.company_id,
            full_name: emp.name,
            role: emp.role
          }
        })
        
        if (authError) {
          throw new Error(`Failed to create auth user: ${authError.message}`)
        }
        
        console.log(`  ✅ Created auth user: ${authUser.user.id}`)
        
        // Step 3: Update employee metadata to link auth user
        const { error: updateError } = await supabase
          .from('employees')
          .update({
            metadata: {
              ...emp.metadata,
              auth_user_id: authUser.user.id,
              migrated_at: new Date().toISOString()
            }
          })
          .eq('id', emp.id)
        
        if (updateError) {
          throw new Error(`Failed to update employee metadata: ${updateError.message}`)
        }
        
        // Step 4: Create user_profile entry
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: authUser.user.id,
            company_id: emp.company_id,
            employee_id: emp.id,
            role: 'employee',
            permissions: { employee_portal: true },
            is_active: true
          })
        
        if (profileError && !profileError.message.includes('duplicate')) {
          throw new Error(`Failed to create user profile: ${profileError.message}`)
        }
        
        console.log(`  ✅ Employee ${emp.name} migrated successfully`)
        migrationResults.push({ 
          employee: emp.name, 
          status: 'success', 
          auth_user_id: authUser.user.id,
          synthetic_email: syntheticEmail
        })
        
      } catch (error) {
        console.error(`  ❌ Failed to migrate ${emp.name}: ${error.message}`)
        migrationResults.push({ 
          employee: emp.name, 
          status: 'failed', 
          error: error.message 
        })
      }
    }
    
    // Step 5: Summary
    console.log('\n📊 Migration Summary:')
    const successful = migrationResults.filter(r => r.status === 'success').length
    const failed = migrationResults.filter(r => r.status === 'failed').length
    const skipped = migrationResults.filter(r => r.status === 'skipped').length
    
    console.log(`  ✅ Successful: ${successful}`)
    console.log(`  ❌ Failed: ${failed}`)
    console.log(`  ⏭️  Skipped: ${skipped}`)
    
    if (failed > 0) {
      console.log('\n❌ Failed migrations:')
      migrationResults
        .filter(r => r.status === 'failed')
        .forEach(r => console.log(`  - ${r.employee}: ${r.error}`))
    }
    
    console.log('\n🎉 Migration completed!')
    console.log('\nNext steps:')
    console.log('1. Update employee login component to use /api/employees/auth/login-supabase')
    console.log('2. Update middleware to handle Supabase sessions')
    console.log('3. Test login with existing employee credentials')
    console.log('4. Remove old custom auth tables when confirmed working')
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message)
    process.exit(1)
  }
}

// Run migration
if (require.main === module) {
  migrateEmployeesToSupabaseAuth()
}

module.exports = { migrateEmployeesToSupabaseAuth }
