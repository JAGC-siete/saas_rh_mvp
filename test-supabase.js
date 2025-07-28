// Test Supabase connection
const { createAdminClient } = require('./lib/supabase/server')

async function testConnection() {
  try {
    console.log('Testing Supabase connection...')
    
    const supabase = createAdminClient()
    
    // Test simple query
    const { data, error } = await supabase
      .from('employees')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Connection failed:', error.message)
    } else {
      console.log('✅ Connection successful!')
      console.log('Data:', data)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testConnection()
