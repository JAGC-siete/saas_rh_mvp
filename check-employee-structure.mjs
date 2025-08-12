import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkEmployeeStructure() {
  try {
    console.log('🔍 Checking employee table structure...')
    
    // 1. Get table structure
    const { data: columns, error: columnsError } = await supabase
      .from('employees')
      .select('*')
      .limit(1)
    
    if (columnsError) {
      console.error('❌ Error getting columns:', columnsError.message)
      return
    }
    
    if (columns && columns.length > 0) {
      console.log('✅ Employee table columns:', Object.keys(columns[0]))
      
      // 2. Check if there's a user_id or email column
      const hasUserId = 'user_id' in columns[0]
      const hasEmail = 'email' in columns[0]
      const hasDni = 'dni' in columns[0]
      
      console.log('\n🔗 Linking columns:')
      console.log('- user_id:', hasUserId ? '✅' : '❌')
      console.log('- email:', hasEmail ? '✅' : '❌')
      console.log('- dni:', hasDni ? '✅' : '❌')
      
      // 3. Show sample data
      console.log('\n📊 Sample employee data:')
      console.log(JSON.stringify(columns[0], null, 2))
      
    } else {
      console.log('⚠️  No employees found in table')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkEmployeeStructure()
