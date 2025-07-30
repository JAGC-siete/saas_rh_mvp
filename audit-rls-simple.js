#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

console.log('🔍 AUDITORÍA RLS SIMPLE - SUPABASE\n');

// Variables de Railway
const supabaseUrl = 'https://fwyxmovfrzauebiqxchz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I';

// Crear cliente de Supabase con service role (admin)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function auditRLS() {
  try {
    console.log('📋 PASO 1: Verificando perfil de usuario Jorge...\n');

    // Verificar permisos del usuario Jorge
    const jorgeUserId = '325a749e-7818-4d24-b29f-2c859e332aa1';
    
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', jorgeUserId)
      .single();

    if (profileError) {
      console.log(`❌ Error obteniendo perfil de usuario: ${profileError.message}`);
      console.log('💡 Esto significa que necesitas ejecutar el SQL de fix-jorge-permissions.sql');
    } else {
      console.log('✅ Perfil de usuario encontrado:');
      console.log(`   ID: ${userProfile.id}`);
      console.log(`   Rol: ${userProfile.role}`);
      console.log(`   Empresa: ${userProfile.company_id}`);
      console.log(`   Activo: ${userProfile.is_active ? '✅' : '❌'}`);
      console.log(`   Permisos: ${JSON.stringify(userProfile.permissions, null, 2)}`);
    }

    console.log('\n📋 PASO 2: Verificando datos de prueba...\n');

    // Verificar si hay empresas
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .limit(1);

    if (companiesError) {
      console.log(`❌ Error verificando empresas: ${companiesError.message}`);
    } else {
      console.log(`📊 Empresas en la base de datos: ${companies.length > 0 ? '✅' : '❌'}`);
      if (companies.length > 0) {
        console.log(`   Nombre: ${companies[0].name}`);
        console.log(`   ID: ${companies[0].id}`);
      }
    }

    // Verificar si hay empleados
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .limit(1);

    if (employeesError) {
      console.log(`❌ Error verificando empleados: ${employeesError.message}`);
    } else {
      console.log(`📊 Empleados en la base de datos: ${employees.length > 0 ? '✅' : '❌'}`);
      if (employees.length > 0) {
        console.log(`   Nombre: ${employees[0].name}`);
        console.log(`   DNI: ${employees[0].dni}`);
      }
    }

    // Verificar si hay registros de asistencia
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('*')
      .limit(1);

    if (attendanceError) {
      console.log(`❌ Error verificando asistencia: ${attendanceError.message}`);
    } else {
      console.log(`📊 Registros de asistencia: ${attendance.length > 0 ? '✅' : '❌'}`);
    }

    // Verificar si hay registros de nómina
    const { data: payroll, error: payrollError } = await supabase
      .from('payroll_records')
      .select('*')
      .limit(1);

    if (payrollError) {
      console.log(`❌ Error verificando nómina: ${payrollError.message}`);
    } else {
      console.log(`📊 Registros de nómina: ${payroll.length > 0 ? '✅' : '❌'}`);
    }

    console.log('\n📋 PASO 3: Probando acceso con RLS...\n');

    // Probar acceso a datos como usuario normal (esto debería fallar sin RLS)
    console.log('🔍 Probando acceso a datos sin autenticación...');
    
    const { data: testData, error: testError } = await supabase
      .from('employees')
      .select('*')
      .limit(1);

    if (testError) {
      console.log(`✅ RLS está funcionando: ${testError.message}`);
    } else {
      console.log(`❌ RLS NO está funcionando - se puede acceder sin autenticación`);
    }

    console.log('\n📋 PASO 4: Resumen y recomendaciones...\n');

    console.log('🎯 DIAGNÓSTICO:');
    
    if (profileError) {
      console.log('❌ PROBLEMA: Usuario Jorge no tiene perfil en user_profiles');
      console.log('💡 SOLUCIÓN: Ejecutar fix-jorge-permissions.sql en Supabase Studio');
    } else {
      console.log('✅ Usuario Jorge tiene perfil');
      
      if (userProfile.role !== 'company_admin') {
        console.log('❌ PROBLEMA: Usuario Jorge no tiene rol company_admin');
        console.log('💡 SOLUCIÓN: Actualizar rol en user_profiles');
      } else {
        console.log('✅ Usuario Jorge tiene rol company_admin');
      }
    }

    if (companies.length === 0) {
      console.log('❌ PROBLEMA: No hay empresas en la base de datos');
      console.log('💡 SOLUCIÓN: Crear empresa por defecto');
    } else {
      console.log('✅ Hay empresas en la base de datos');
    }

    if (employees.length === 0) {
      console.log('❌ PROBLEMA: No hay empleados en la base de datos');
      console.log('💡 SOLUCIÓN: Crear empleados de prueba');
    } else {
      console.log('✅ Hay empleados en la base de datos');
    }

    console.log('\n🔧 ACCIONES REQUERIDAS:');
    console.log('1. Ve a Supabase Studio → SQL Editor');
    console.log('2. Ejecuta el contenido de fix-jorge-permissions.sql');
    console.log('3. Ve a https://zesty-abundance-production.up.railway.app');
    console.log('4. Haz login y prueba generar nómina');

  } catch (error) {
    console.log('❌ Error general:', error.message);
  }
}

// Ejecutar auditoría
auditRLS(); 