#!/usr/bin/env node

/**
 * Script de importación mejorado con manejo de errores
 * Generado por fix-import-issues-simple.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config();

console.log('🚀 IMPORTACIÓN MEJORADA DE DATOS');
console.log('='.repeat(50));

// Verificar variables de entorno
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Variables de entorno requeridas no encontradas');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importData() {
  try {
    // Verificar conexión
    console.log('🔍 Verificando conexión a Supabase...');
    const { data: testData, error: testError } = await supabase
      .from('companies')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Error de conexión:', testError.message);
      process.exit(1);
    }
    console.log('✅ Conexión exitosa');

    // Importar companies
    console.log('\n📦 Importando empresas...');
    const companiesPath = path.join(__dirname, 'companies.json');
    if (!fs.existsSync(companiesPath)) {
      throw new Error('Archivo companies.json no encontrado');
    }
    
    const companiesData = JSON.parse(fs.readFileSync(companiesPath, 'utf8'));
    if (!Array.isArray(companiesData) || companiesData.length === 0) {
      throw new Error('Datos de empresas inválidos o vacíos');
    }
    
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .upsert(companiesData, { onConflict: 'id' });
    
    if (companiesError) throw companiesError;
    console.log(`✅ Companies importadas: ${companies?.length || companiesData.length}`);
    
    // Importar departments
    console.log('📦 Importando departamentos...');
    const departmentsPath = path.join(__dirname, 'departments.json');
    if (!fs.existsSync(departmentsPath)) {
      throw new Error('Archivo departments.json no encontrado');
    }
    
    const departmentsData = JSON.parse(fs.readFileSync(departmentsPath, 'utf8'));
    if (!Array.isArray(departmentsData) || departmentsData.length === 0) {
      throw new Error('Datos de departamentos inválidos o vacíos');
    }
    
    const { data: departments, error: departmentsError } = await supabase
      .from('departments')
      .upsert(departmentsData, { onConflict: 'id' });
    
    if (departmentsError) throw departmentsError;
    console.log(`✅ Departments importados: ${departments?.length || departmentsData.length}`);
    
    // Importar employees
    console.log('📦 Importando empleados...');
    const employeesPath = path.join(__dirname, 'employees.json');
    if (!fs.existsSync(employeesPath)) {
      throw new Error('Archivo employees.json no encontrado');
    }
    
    const employeesData = JSON.parse(fs.readFileSync(employeesPath, 'utf8'));
    if (!Array.isArray(employeesData) || employeesData.length === 0) {
      throw new Error('Datos de empleados inválidos o vacíos');
    }
    
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .upsert(employeesData, { onConflict: 'id' });
    
    if (employeesError) throw employeesError;
    console.log(`✅ Employees importados: ${employees?.length || employeesData.length}`);
    
    console.log('\n🎉 IMPORTACIÓN COMPLETADA EXITOSAMENTE');
    console.log('='.repeat(50));
    console.log('📊 Resumen:');
    console.log(`   - Empresas: ${companies?.length || companiesData.length}`);
    console.log(`   - Departamentos: ${departments?.length || departmentsData.length}`);
    console.log(`   - Empleados: ${employees?.length || employeesData.length}`);
    console.log('\n✅ Los datos están listos para usar en la aplicación');
    
  } catch (error) {
    console.error('❌ Error en importación:', error.message);
    console.error('\n💡 Solución:');
    console.error('1. Verifica que las migraciones estén aplicadas: supabase db push');
    console.error('2. Verifica las variables de entorno');
    console.error('3. Verifica la conexión a Supabase');
    console.error('4. Ejecuta: node scripts/fix-import-issues-simple.js');
    process.exit(1);
  }
}

importData();
