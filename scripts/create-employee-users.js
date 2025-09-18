#!/usr/bin/env node

/**
 * Create Employee Users in Supabase Auth
 * 
 * This script creates synthetic users in Supabase Auth for employee portal access.
 * Since we can't use admin.createUser() without admin privileges, we'll use a different approach.
 * 
 * Strategy:
 * 1. Create users via Supabase Auth API directly
 * 2. Use synthetic emails: {last5}@paragon.employee.local
 * 3. Use 4-digit PIN as password
 * 4. Store employee metadata in user_metadata
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const COMPANY_ID = '00000000-0000-0000-0000-000000000001' // Paragon

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

// Create client with anon key (for signup)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Sample employee data for testing - replace with real data
const SAMPLE_EMPLOYEES = [
  { 
    id: '00000000-0000-0000-0000-000000000001',
    dni: '0801-1990-00731', 
    name: 'Jorge Arturo Gómez Coello', 
    role: 'Desarrollador',
    pin: '2944' // This would be generated/assigned by HR
  },
  { 
    id: '00000000-0000-0000-0000-000000000002',
    dni: '0801-1985-12345', 
    name: 'María Elena Rodríguez', 
    role: 'Contador',
    pin: '1234' // This would be generated/assigned by HR
  }
]

async function createEmployeeUsers() {
  try {
    console.log('🚀 Creating employee users in Supabase Auth...')
    
    const results = []
    
    for (const emp of SAMPLE_EMPLOYEES) {
      try {
        const last5 = emp.dni.slice(-5)
        const syntheticEmail = `${last5}@paragon.employee.local`
        
        console.log(`👤 Creating user for ${emp.name} (${syntheticEmail})...`)
        
        // Sign up the user
        const { data, error } = await supabase.auth.signUp({
          email: syntheticEmail,
          password: emp.pin,
          options: {
            data: {
              employee_id: emp.id,
              dni_last5: last5,
              is_employee_portal: true,
              company_id: COMPANY_ID,
              full_name: emp.name,
              role: emp.role
            }
          }
        })
        
        if (error) {
          throw new Error(`Signup failed: ${error.message}`)
        }
        
        console.log(`  ✅ User created: ${data.user?.id}`)
        results.push({
          employee: emp.name,
          email: syntheticEmail,
          pin: emp.pin,
          status: 'success',
          user_id: data.user?.id
        })
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`  ❌ Failed to create user for ${emp.name}: ${error.message}`)
        results.push({
          employee: emp.name,
          status: 'failed',
          error: error.message
        })
      }
    }
    
    // Summary
    console.log('\n📊 Creation Summary:')
    const successful = results.filter(r => r.status === 'success').length
    const failed = results.filter(r => r.status === 'failed').length
    
    console.log(`  ✅ Successful: ${successful}`)
    console.log(`  ❌ Failed: ${failed}`)
    
    if (successful > 0) {
      console.log('\n🎉 Employee credentials created:')
      results
        .filter(r => r.status === 'success')
        .forEach(r => {
          console.log(`  - ${r.employee}: ${r.email} / PIN: ${r.pin}`)
        })
    }
    
    if (failed > 0) {
      console.log('\n❌ Failed creations:')
      results
        .filter(r => r.status === 'failed')
        .forEach(r => console.log(`  - ${r.employee}: ${r.error}`))
    }
    
    console.log('\n📝 Next steps:')
    console.log('1. Users created can now login at /employees/portal')
    console.log('2. Test login with the credentials above')
    console.log('3. Update SAMPLE_EMPLOYEES with real employee data')
    console.log('4. Run script again for production employees')
    
  } catch (error) {
    console.error('💥 Script failed:', error.message)
    process.exit(1)
  }
}

// Run script
if (require.main === module) {
  createEmployeeUsers()
}

module.exports = { createEmployeeUsers }
