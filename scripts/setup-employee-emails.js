#!/usr/bin/env node

/**
 * Setup Employee Emails for Portal Access
 * 
 * This script checks and updates employee emails for portal access.
 * It can add missing emails or verify existing ones.
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

async function checkAndSetupEmails() {
  try {
    console.log('🔍 Checking employee emails for portal access...')
    
    // Get all Paragon employees
    const { data: employees, error: fetchError } = await supabase
      .from('employees')
      .select('id, dni, name, email, status')
      .eq('company_id', COMPANY_ID)
      .eq('status', 'active')
    
    if (fetchError) {
      throw new Error(`Failed to fetch employees: ${fetchError.message}`)
    }
    
    console.log(`✅ Found ${employees.length} active employees`)
    console.log('\n📧 Current email status:')
    
    const emailStats = {
      withEmail: 0,
      withoutEmail: 0,
      needUpdate: []
    }
    
    employees.forEach(emp => {
      if (emp.email && emp.email.trim()) {
        emailStats.withEmail++
        console.log(`  ✅ ${emp.name}: ${emp.email}`)
      } else {
        emailStats.withoutEmail++
        console.log(`  ❌ ${emp.name}: NO EMAIL`)
        emailStats.needUpdate.push(emp)
      }
    })
    
    console.log(`\n📊 Summary:`)
    console.log(`  ✅ With email: ${emailStats.withEmail}`)
    console.log(`  ❌ Without email: ${emailStats.withoutEmail}`)
    
    // Check if Jorge's email exists
    const jorgeEmployee = employees.find(emp => 
      emp.name.toLowerCase().includes('jorge') && 
      emp.name.toLowerCase().includes('gomez')
    )
    
    if (jorgeEmployee) {
      console.log(`\n👤 Found Jorge: ${jorgeEmployee.name}`)
      console.log(`   Current email: ${jorgeEmployee.email || 'NO EMAIL'}`)
      
      if (!jorgeEmployee.email || jorgeEmployee.email !== 'jorge7gomez@gmail.com') {
        console.log(`\n🔧 Updating Jorge's email to jorge7gomez@gmail.com...`)
        
        const { error: updateError } = await supabase
          .from('employees')
          .update({ email: 'jorge7gomez@gmail.com' })
          .eq('id', jorgeEmployee.id)
        
        if (updateError) {
          console.error(`❌ Failed to update Jorge's email: ${updateError.message}`)
        } else {
          console.log(`✅ Jorge's email updated successfully!`)
        }
      } else {
        console.log(`✅ Jorge's email is already correct`)
      }
    } else {
      console.log(`\n❌ Jorge not found in employees`)
      console.log(`Available employees with 'Jorge':`)
      employees
        .filter(emp => emp.name.toLowerCase().includes('jorge'))
        .forEach(emp => console.log(`  - ${emp.name} (${emp.dni})`))
    }
    
    // Suggest emails for employees without them
    if (emailStats.needUpdate.length > 0) {
      console.log(`\n💡 Suggested emails for employees without email:`)
      emailStats.needUpdate.forEach(emp => {
        const firstName = emp.name.split(' ')[0].toLowerCase()
        const lastName = emp.name.split(' ')[1]?.toLowerCase() || ''
        const suggestedEmail = `${firstName}.${lastName}@paragon.hn`
        console.log(`  - ${emp.name}: ${suggestedEmail}`)
      })
    }
    
    console.log(`\n🎯 Next steps:`)
    console.log(`1. Verify jorge7gomez@gmail.com can now access portal`)
    console.log(`2. Test login at: https://humanosisu.net/employees/portal`)
    console.log(`3. Add emails for other employees as needed`)
    
  } catch (error) {
    console.error('💥 Script failed:', error.message)
    process.exit(1)
  }
}

// Run script
if (require.main === module) {
  checkAndSetupEmails()
}

module.exports = { checkAndSetupEmails }
