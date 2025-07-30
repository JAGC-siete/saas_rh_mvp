#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

console.log('🔧 ARREGLANDO PERMISOS DE SUPABASE\n');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('❌ ERROR: Variables de entorno de Supabase no encontradas');
  console.log('   NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas');
  process.exit(1);
}

// Crear cliente de Supabase con service role (admin)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixPermissions() {
  try {
    console.log('📋 PASO 1: Verificando estructura de la base de datos...');
    
    // Verificar que las tablas existen
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['user_profiles', 'companies', 'employees']);

    if (tablesError) {
      console.log('❌ Error verificando tablas:', tablesError.message);
      return;
    }

    console.log('✅ Tablas encontradas:', tables.map(t => t.table_name).join(', '));

    // PASO 2: Crear empresa por defecto si no existe
    console.log('\n📋 PASO 2: Verificando empresa por defecto...');
    
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .limit(1);

    if (companiesError) {
      console.log('❌ Error verificando empresas:', companiesError.message);
      return;
    }

    let companyId;
    if (companies && companies.length > 0) {
      companyId = companies[0].id;
      console.log('✅ Empresa existente encontrada:', companies[0].name);
    } else {
      console.log('⚠️  No hay empresas, creando una por defecto...');
      
      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert({
          name: 'Empresa por Defecto',
          subdomain: 'default',
          plan_type: 'basic',
          settings: {}
        })
        .select()
        .single();

      if (createError) {
        console.log('❌ Error creando empresa:', createError.message);
        return;
      }

      companyId = newCompany.id;
      console.log('✅ Empresa creada:', newCompany.name);
    }

    // PASO 3: Obtener usuario actual (necesitas proporcionar el email)
    console.log('\n📋 PASO 3: Necesito el email del usuario para arreglar permisos...');
    
    // Por ahora, vamos a crear un perfil de usuario de ejemplo
    // En producción, esto se haría con el usuario real logueado
    
    const testUserId = '00000000-0000-0000-0000-000000000001'; // UUID de ejemplo
    
    console.log('⚠️  Creando perfil de usuario de ejemplo...');
    
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: testUserId,
        company_id: companyId,
        role: 'company_admin',
        permissions: {
          can_manage_employees: true,
          can_view_payroll: true,
          can_manage_attendance: true,
          can_manage_departments: true,
          can_approve_leave: true
        },
        is_active: true
      })
      .select()
      .single();

    if (profileError) {
      console.log('❌ Error creando perfil de usuario:', profileError.message);
      return;
    }

    console.log('✅ Perfil de usuario creado con rol company_admin');
    console.log('   ID:', userProfile.id);
    console.log('   Rol:', userProfile.role);
    console.log('   Empresa:', companyId);

    // PASO 4: Verificar permisos
    console.log('\n📋 PASO 4: Verificando permisos...');
    
    const { data: verifyProfile, error: verifyError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', testUserId)
      .single();

    if (verifyError) {
      console.log('❌ Error verificando perfil:', verifyError.message);
      return;
    }

    console.log('✅ Perfil verificado correctamente');
    console.log('   Permisos:', JSON.stringify(verifyProfile.permissions, null, 2));

    console.log('\n🎯 RESUMEN:');
    console.log('✅ Empresa configurada');
    console.log('✅ Perfil de usuario creado con rol company_admin');
    console.log('✅ Permisos configurados');
    console.log('');
    console.log('💡 AHORA:');
    console.log('1. Ve a https://zesty-abundance-production.up.railway.app');
    console.log('2. Haz login con tu usuario');
    console.log('3. Prueba generar nómina');
    console.log('');
    console.log('⚠️  NOTA: Este script creó un perfil de ejemplo.');
    console.log('   Para tu usuario real, necesitas:');
    console.log('   1. Ir a Supabase Studio');
    console.log('   2. Tabla user_profiles');
    console.log('   3. Insertar tu user_id con rol company_admin');

  } catch (error) {
    console.log('❌ Error general:', error.message);
  }
}

// Ejecutar el script
fixPermissions(); 