import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugCompanies() {
  try {
    console.log('🔍 Buscando empresas demo...')
    
    // Buscar todas las empresas que contengan "DEMO"
    const { data: demoCompanies, error: demoError } = await supabase
      .from('companies')
      .select('id, name, subdomain, is_active, created_at')
      .ilike('name', '%DEMO%')
      .order('created_at', { ascending: false })
    
    if (demoError) {
      console.error('❌ Error buscando empresas demo:', demoError)
      return
    }
    
    console.log('📋 Empresas con "DEMO" en el nombre:')
    console.log(demoCompanies)
    
    // Buscar todas las empresas activas
    const { data: activeCompanies, error: activeError } = await supabase
      .from('companies')
      .select('id, name, subdomain, is_active, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (activeError) {
      console.error('❌ Error buscando empresas activas:', activeError)
      return
    }
    
    console.log('\n📋 Empresas activas (primeras 10):')
    console.log(activeCompanies)
    
    // Buscar empresas que contengan "PRUEBA"
    const { data: pruebaCompanies, error: pruebaError } = await supabase
      .from('companies')
      .select('id, name, subdomain, is_active, created_at')
      .ilike('name', '%PRUEBA%')
      .order('created_at', { ascending: false })
    
    if (pruebaError) {
      console.error('❌ Error buscando empresas con "PRUEBA":', pruebaError)
      return
    }
    
    console.log('\n📋 Empresas con "PRUEBA" en el nombre:')
    console.log(pruebaCompanies)
    
  } catch (error) {
    console.error('💥 Error general:', error)
  }
}

debugCompanies()
