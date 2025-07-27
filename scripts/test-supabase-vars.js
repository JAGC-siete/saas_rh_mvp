#!/usr/bin/env node

console.log('🧪 TESTING SUPABASE ENVIRONMENT VARIABLES\n')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('📋 Variables detected:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', url ? '✅ SET' : '❌ MISSING')
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', key ? '✅ SET' : '❌ MISSING')
console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✅ SET' : '❌ MISSING')

console.log('\n🔍 Key format analysis:')
if (key) {
  if (key.startsWith('sb_publishable_')) {
    console.log('ANON_KEY: ✅ NEW FORMAT (sb_publishable_...)')
  } else if (key.startsWith('eyJ')) {
    console.log('ANON_KEY: ⚠️ OLD FORMAT (JWT token)')
  } else {
    console.log('ANON_KEY: ❓ UNKNOWN FORMAT')
  }
}

if (serviceKey) {
  if (serviceKey.startsWith('sb_secret_')) {
    console.log('SERVICE_KEY: ✅ NEW FORMAT (sb_secret_...)')
  } else if (serviceKey.startsWith('eyJ')) {
    console.log('SERVICE_KEY: ⚠️ OLD FORMAT (JWT token)')
  } else {
    console.log('SERVICE_KEY: ❓ UNKNOWN FORMAT')
  }
}

console.log('\n🎯 Next steps:')
if (!url || !key) {
  console.log('❌ Set missing environment variables first')
} else if (key.startsWith('eyJ')) {
  console.log('⚠️ Update to new Supabase key format (sb_publishable_...)')
} else {
  console.log('✅ Environment looks good!')
}
