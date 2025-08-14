import { createAdminClient } from './lib/supabase/server.ts'

const supabase = createAdminClient()

async function testActivaciones() {
  try {
    console.log('🔍 Testing connection to activaciones table...')
    
    // Test basic connection
    const { data, error } = await supabase
      .from('activaciones')
      .select('count', { count: 'exact', head: true })
    
    if (error) {
      console.log('❌ Error connecting to activaciones table:', error.message)
      return false
    }
    
    console.log('✅ Connected to activaciones table successfully')
    
    // Test table structure by getting one record
    const { data: sample, error: sampleError } = await supabase
      .from('activaciones')
      .select('*')
      .limit(1)
    
    if (sampleError) {
      console.log('❌ Error getting sample record:', sampleError.message)
      return false
    }
    
    console.log('📊 Sample record structure:', sample?.[0] ? Object.keys(sample[0]) : 'No records found')
    
    // Test insert with dummy data
    const testData = {
      empleados: 5,
      empresa: 'Test Company',
      contacto_nombre: 'Test User',
      contacto_whatsapp: '9999-9999',
      contacto_email: 'test@test.com',
      departamentos: { total: 2 },
      monto: 1500,
      status: 'pending'
    }
    
    console.log('🧪 Testing insert operation...')
    const { data: insertResult, error: insertError } = await supabase
      .from('activaciones')
      .insert([testData])
      .select()
    
    if (insertError) {
      console.log('❌ Insert test failed:', insertError.message)
      return false
    }
    
    console.log('✅ Insert test successful:', insertResult?.[0]?.id)
    
    // Clean up test record
    if (insertResult?.[0]?.id) {
      await supabase
        .from('activaciones')
        .delete()
        .eq('id', insertResult[0].id)
      console.log('🧹 Test record cleaned up')
    }
    
    return true
    
  } catch (err) {
    console.log('❌ Unexpected error:', err.message)
    return false
  }
}

testActivaciones().then(success => {
  console.log(success ? '🎉 All tests passed!' : '💥 Some tests failed')
  process.exit(success ? 0 : 1)
})
