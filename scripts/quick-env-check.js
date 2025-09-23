#!/usr/bin/env node
// Verificación rápida de variables de entorno
require('dotenv').config({ path: '.env' });

console.log('🔍 VERIFICACIÓN RÁPIDA:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌');

if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.log('\n✅ Variables configuradas correctamente');
} else {
  console.log('\n❌ Variables faltantes - revisa tu archivo .env');
}
