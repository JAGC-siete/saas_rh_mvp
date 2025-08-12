#!/usr/bin/env node

/**
 * Script para actualizar permisos del usuario jefe@paragon.com
 * Restringe acceso a configuración
 */

const SUPABASE_URL = 'https://fwyxmovfrzauebiqxchz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I';

async function updateJefePermissions() {
  try {
    console.log('🔧 Actualizando permisos del usuario jefe@paragon.com...');
    
    // 1. Obtener la empresa
    const companyResponse = await fetch(`${SUPABASE_URL}/rest/v1/companies?select=id&order=created_at.asc&limit=1`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    
    if (!companyResponse.ok) {
      throw new Error('No se pudo obtener la empresa');
    }
    
    const companies = await companyResponse.json();
    const companyId = companies[0]?.id;
    
    if (!companyId) {
      throw new Error('No se encontró ninguna empresa');
    }
    
    console.log('   Empresa ID:', companyId);
    
    // 2. Actualizar permisos del usuario
    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.673e3f25-7b52-4861-b806-a83aba950da3`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        company_id: companyId,
        role: 'company_admin',
        permissions: {
          dashboard: true,
          employees: true,
          departments: true,
          attendance: true,
          leave: true,
          payroll: true,
          reports: true,
          gamification: true,
          settings: false  // ← CONFIGURACIÓN BLOQUEADA
        },
        is_active: true,
        updated_at: new Date().toISOString()
      })
    });
    
    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error(`Error actualizando permisos: ${error}`);
    }
    
    console.log('✅ Permisos actualizados exitosamente!');
    console.log('   Configuración: BLOQUEADA ❌');
    console.log('   Dashboard: PERMITIDO ✅');
    console.log('   Empleados: PERMITIDO ✅');
    console.log('   Asistencia: PERMITIDO ✅');
    
    // 3. Verificar que se aplicó
    const verifyResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.673e3f25-7b52-4861-b806-a83aba950da3&select=*`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    
    if (verifyResponse.ok) {
      const user = await verifyResponse.json();
      console.log('\n📋 Usuario actualizado:');
      console.log('   ID:', user[0]?.id);
      console.log('   Role:', user[0]?.role);
      console.log('   Permisos:', JSON.stringify(user[0]?.permissions, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateJefePermissions();
