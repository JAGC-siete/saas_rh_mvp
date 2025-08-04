#!/usr/bin/env node

/**
 * Script final de importación de datos
 * Ejecutar después de corregir las migraciones de Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config();

console.log('🚀 INICIANDO IMPORTACIÓN FINAL DE DATOS');
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
    console.log('📦 Importando empresas...');
    const companiesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'companies.json'), 'utf8'));
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .upsert(companiesData, { onConflict: 'id' });
    
    if (companiesError) throw companiesError;
    console.log(`✅ Companies importadas: ${companies.length}`);
    
    console.log('📦 Importando departamentos...');
    const departmentsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'departments.json'), 'utf8'));
    const { data: departments, error: departmentsError } = await supabase
      .from('departments')
      .upsert(departmentsData, { onConflict: 'id' });
    
    if (departmentsError) throw departmentsError;
    console.log(`✅ Departments importados: ${departments.length}`);
    
    console.log('📦 Importando empleados...');
    const employeesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'employees.json'), 'utf8'));
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .upsert(employeesData, { onConflict: 'id' });
    
    if (employeesError) throw employeesError;
    console.log(`✅ Employees importados: ${employees.length}`);
    
    console.log('\n🎉 IMPORTACIÓN COMPLETADA EXITOSAMENTE');
    console.log('='.repeat(50));
    console.log('📊 Resumen:');
    console.log(`   - Empresas: ${companies.length}`);
    console.log(`   - Departamentos: ${departments.length}`);
    console.log(`   - Empleados: ${employees.length}`);
    console.log('\n✅ Los datos están listos para usar en la aplicación');
    
  } catch (error) {
    console.error('❌ Error en importación:', error.message);
    console.error('💡 Solución:');
    console.error('1. Verifica que las migraciones estén aplicadas: supabase db push');
    console.error('2. Verifica las variables de entorno');
    console.error('3. Verifica la conexión a Supabase');
    process.exit(1);
  }
}

importData();
