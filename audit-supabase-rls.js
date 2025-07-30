#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

console.log('🔍 AUDITORÍA COMPLETA DE RLS Y POLÍTICAS EN SUPABASE\n');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('❌ ERROR: Variables de entorno de Supabase no encontradas');
  console.log('   NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas');
  console.log('');
  console.log('💡 SOLUCIÓN:');
  console.log('   1. Ve a Supabase Studio → Settings → API');
  console.log('   2. Copia las variables');
  console.log('   3. Ejecuta: export NEXT_PUBLIC_SUPABASE_URL="tu_url"');
  console.log('   4. Ejecuta: export SUPABASE_SERVICE_ROLE_KEY="tu_key"');
  process.exit(1);
}

// Crear cliente de Supabase con service role (admin)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function auditRLS() {
  try {
    console.log('📋 PASO 1: Verificando tablas con RLS habilitado...\n');
    
    // Obtener todas las tablas con RLS habilitado
    const { data: rlsTables, error: rlsError } = await supabase
      .rpc('get_rls_tables');

    if (rlsError) {
      // Fallback: consulta directa
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');

      if (tablesError) {
        console.log('❌ Error obteniendo tablas:', tablesError.message);
        return;
      }

      console.log('📊 Tablas encontradas:', tables.length);
      for (const table of tables) {
        console.log(`   - ${table.table_name}`);
      }
    } else {
      console.log('📊 Tablas con RLS habilitado:', rlsTables.length);
      for (const table of rlsTables) {
        console.log(`   - ${table.table_name} (RLS: ${table.rls_enabled ? '✅' : '❌'})`);
      }
    }

    console.log('\n📋 PASO 2: Verificando políticas RLS por tabla...\n');

    // Lista de tablas importantes para auditar
    const importantTables = [
      'user_profiles',
      'companies', 
      'employees',
      'attendance_records',
      'payroll_records',
      'departments',
      'leave_requests',
      'audit_logs'
    ];

    for (const tableName of importantTables) {
      console.log(`🔍 Tabla: ${tableName}`);
      
      // Verificar si RLS está habilitado
      const { data: rlsStatus, error: rlsStatusError } = await supabase
        .rpc('check_rls_status', { table_name: tableName });

      if (rlsStatusError) {
        console.log(`   ⚠️  No se pudo verificar RLS para ${tableName}`);
        continue;
      }

      console.log(`   RLS habilitado: ${rlsStatus.rls_enabled ? '✅' : '❌'}`);

      // Obtener políticas de la tabla
      const { data: policies, error: policiesError } = await supabase
        .from('information_schema.policies')
        .select('*')
        .eq('table_schema', 'public')
        .eq('table_name', tableName);

      if (policiesError) {
        console.log(`   ❌ Error obteniendo políticas: ${policiesError.message}`);
        continue;
      }

      if (policies && policies.length > 0) {
        console.log(`   📋 Políticas encontradas: ${policies.length}`);
        for (const policy of policies) {
          console.log(`      - ${policy.policy_name} (${policy.permissive ? 'PERMISSIVE' : 'RESTRICTIVE'})`);
          console.log(`        Operación: ${policy.action}`);
          console.log(`        Roles: ${policy.roles || 'ALL'}`);
          console.log(`        Comando: ${policy.cmd}`);
          console.log(`        Definición: ${policy.qual}`);
        }
      } else {
        console.log(`   ⚠️  No hay políticas definidas`);
      }

      console.log('');
    }

    console.log('📋 PASO 3: Verificando permisos de usuario actual...\n');

    // Verificar permisos del usuario Jorge
    const jorgeUserId = '325a749e-7818-4d24-b29f-2c859e332aa1';
    
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', jorgeUserId)
      .single();

    if (profileError) {
      console.log(`❌ Error obteniendo perfil de usuario: ${profileError.message}`);
    } else {
      console.log('✅ Perfil de usuario encontrado:');
      console.log(`   ID: ${userProfile.id}`);
      console.log(`   Rol: ${userProfile.role}`);
      console.log(`   Empresa: ${userProfile.company_id}`);
      console.log(`   Activo: ${userProfile.is_active ? '✅' : '❌'}`);
      console.log(`   Permisos: ${JSON.stringify(userProfile.permissions, null, 2)}`);
    }

    console.log('\n📋 PASO 4: Verificando datos de prueba...\n');

    // Verificar si hay datos para probar
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('count')
      .limit(1);

    if (companiesError) {
      console.log(`❌ Error verificando empresas: ${companiesError.message}`);
    } else {
      console.log(`📊 Empresas en la base de datos: ${companies.length > 0 ? '✅' : '❌'}`);
    }

    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('count')
      .limit(1);

    if (employeesError) {
      console.log(`❌ Error verificando empleados: ${employeesError.message}`);
    } else {
      console.log(`📊 Empleados en la base de datos: ${employees.length > 0 ? '✅' : '❌'}`);
    }

    console.log('\n📋 PASO 5: Resumen de seguridad...\n');

    console.log('🎯 RECOMENDACIONES:');
    console.log('1. ✅ Verificar que todas las tablas tengan RLS habilitado');
    console.log('2. ✅ Verificar que las políticas estén correctamente definidas');
    console.log('3. ✅ Verificar que el usuario tenga el rol correcto');
    console.log('4. ✅ Verificar que haya datos para probar');
    console.log('');
    console.log('🔧 SI HAY PROBLEMAS:');
    console.log('1. Ejecutar el SQL de fix-jorge-permissions.sql');
    console.log('2. Verificar que las políticas RLS estén activas');
    console.log('3. Probar con datos de ejemplo');

  } catch (error) {
    console.log('❌ Error general:', error.message);
  }
}

// Función auxiliar para verificar RLS (si no existe la función)
async function checkRLSStatus(tableName) {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .single();

    return { exists: !!data, error };
  } catch (err) {
    return { exists: false, error: err };
  }
}

// Ejecutar auditoría
auditRLS(); 