import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://fwyxmovfrzauebiqxchz.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I"

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkGustavoEmployee() {
  try {
    console.log('🔍 Checking Gustavo in employees table...')
    
    // 1. Search by email
    const { data: byEmail, error: emailError } = await supabase
      .from('employees')
      .select('*')
      .eq('email', 'gustavo.gnaz@gmail.com')
    
    console.log('\n📧 Search by email gustavo.gnaz@gmail.com:')
    if (emailError) {
      console.error('❌ Error:', emailError.message)
    } else if (byEmail && byEmail.length > 0) {
      console.log('✅ Found by email:', byEmail.length, 'records')
      console.log(JSON.stringify(byEmail[0], null, 2))
    } else {
      console.log('❌ No employee found with this email')
    }
    
    // 2. Search by name (partial)
    const { data: byName, error: nameError } = await supabase
      .from('employees')
      .select('*')
      .ilike('name', '%gustavo%')
    
    console.log('\n👤 Search by name containing "gustavo":')
    if (nameError) {
      console.error('❌ Error:', nameError.message)
    } else if (byName && byName.length > 0) {
      console.log('✅ Found by name:', byName.length, 'records')
      byName.forEach((emp, i) => {
        console.log(`${i+1}. ${emp.name} (${emp.email || 'NO EMAIL'}) - ${emp.role}`)
      })
    } else {
      console.log('❌ No employee found with name containing "gustavo"')
    }
    
    // 3. List all employees with emails
    const { data: withEmails, error: listError } = await supabase
      .from('employees')
      .select('name, email, role')
      .not('email', 'is', null)
      .limit(5)
    
    console.log('\n📧 Employees with emails (sample):')
    if (listError) {
      console.error('❌ Error:', listError.message)
    } else if (withEmails && withEmails.length > 0) {
      withEmails.forEach((emp, i) => {
        console.log(`${i+1}. ${emp.name}: ${emp.email} (${emp.role})`)
      })
    } else {
      console.log('❌ No employees with emails found')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkGustavoEmployee()
