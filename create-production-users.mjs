import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createProductionUsers() {
  console.log('🚀 Creating production users...\n')

  try {
    // Create admin user
    console.log('👤 Creating admin user...')
    const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
      email: 'admin@empresa.com',
      password: 'admin123456',
      email_confirm: true,
      user_metadata: {
        name: 'Administrador'
      }
    })

    if (adminError) {
      if (adminError.message.includes('already been registered')) {
        console.log('✅ Admin user already exists')
      } else {
        console.error('❌ Error creating admin:', adminError.message)
      }
    } else {
      console.log('✅ Admin created successfully:', adminData.user?.email)
    }

    // Create HR user
    console.log('\n👤 Creating HR user...')
    const { data: hrData, error: hrError } = await supabase.auth.admin.createUser({
      email: 'hr@empresa.com',
      password: 'hr123456',
      email_confirm: true,
      user_metadata: {
        name: 'Recursos Humanos'
      }
    })

    if (hrError) {
      if (hrError.message.includes('already been registered')) {
        console.log('✅ HR user already exists')
      } else {
        console.error('❌ Error creating HR:', hrError.message)
      }
    } else {
      console.log('✅ HR created successfully:', hrData.user?.email)
    }

    // Create Jorge user
    console.log('\n👤 Creating Jorge user...')
    const { data: jorgeData, error: jorgeError } = await supabase.auth.admin.createUser({
      email: 'jorge7gomez@gmail.com',
      password: 'jorge123456',
      email_confirm: true,
      user_metadata: {
        name: 'Jorge Gómez'
      }
    })

    if (jorgeError) {
      if (jorgeError.message.includes('already been registered')) {
        console.log('✅ Jorge user already exists')
      } else {
        console.error('❌ Error creating Jorge:', jorgeError.message)
      }
    } else {
      console.log('✅ Jorge created successfully:', jorgeData.user?.email)
    }

    console.log('\n🎉 User creation process completed!')
    console.log('\n📋 Valid credentials for testing:')
    console.log('👤 Admin: admin@empresa.com / admin123456')
    console.log('👤 HR: hr@empresa.com / hr123456')
    console.log('👤 Jorge: jorge7gomez@gmail.com / jorge123456')

    // Test authentication
    console.log('\n🧪 Testing authentication...')
    await testAuthentication()

  } catch (err) {
    console.error('❌ Error:', err)
  }
}

async function testAuthentication() {
  try {
    // Test admin login
    console.log('\n🔐 Testing admin login...')
    const { data: adminAuth, error: adminAuthError } = await supabase.auth.signInWithPassword({
      email: 'admin@empresa.com',
      password: 'admin123456'
    })

    if (adminAuthError) {
      console.error('❌ Admin login failed:', adminAuthError.message)
    } else {
      console.log('✅ Admin login successful:', adminAuth.user?.email)
    }

    // Test HR login
    console.log('\n🔐 Testing HR login...')
    const { data: hrAuth, error: hrAuthError } = await supabase.auth.signInWithPassword({
      email: 'hr@empresa.com',
      password: 'hr123456'
    })

    if (hrAuthError) {
      console.error('❌ HR login failed:', hrAuthError.message)
    } else {
      console.log('✅ HR login successful:', hrAuth.user?.email)
    }

    // Test Jorge login
    console.log('\n🔐 Testing Jorge login...')
    const { data: jorgeAuth, error: jorgeAuthError } = await supabase.auth.signInWithPassword({
      email: 'jorge7gomez@gmail.com',
      password: 'jorge123456'
    })

    if (jorgeAuthError) {
      console.error('❌ Jorge login failed:', jorgeAuthError.message)
    } else {
      console.log('✅ Jorge login successful:', jorgeAuth.user?.email)
    }

    console.log('\n🎯 Authentication testing completed!')

  } catch (err) {
    console.error('❌ Authentication test error:', err)
  }
}

// Run the script
createProductionUsers() 