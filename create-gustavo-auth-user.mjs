#!/usr/bin/env node

/**
 * Script para crear el usuario Gustavo en Supabase Auth
 * Usa la API de Supabase para crear el usuario
 */

const SUPABASE_URL = 'https://fwyxmovfrzauebiqxchz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I';

async function createGustavoUser() {
  try {
    console.log('🔐 Creando usuario Gustavo en Supabase Auth...');
    
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        email: 'gustavo.gnaz@gmail.com',
        password: 'eljefe123456',
        email_confirm: true,
        user_metadata: {
          name: 'Gustavo Noel Argueta Zelaya',
          role: 'company_admin'
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error creando usuario:', error);
      return;
    }

    const user = await response.json();
    console.log('✅ Usuario creado exitosamente:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Email confirmado:', user.email_confirmed_at);
    
    // Ahora probar login
    console.log('\n🔑 Probando login...');
    const loginResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxODk5MjEsImV4cCI6MjA2Nzc2NTkyMX0.pXArDqHGA4yjprTqJfsNQXwzS-WLz6NCK5QRbLAyYmA'
      },
      body: JSON.stringify({
        email: 'gustavo.gnaz@gmail.com',
        password: 'eljefe123456'
      })
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login exitoso!');
      console.log('   Access Token:', loginData.access_token?.substring(0, 50) + '...');
    } else {
      const loginError = await loginResponse.text();
      console.log('❌ Login falló:', loginError);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createGustavoUser();
