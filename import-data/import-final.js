#!/usr/bin/env node

/**
 * Script de importación final con estructura real de la base de datos
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config();

console.log('🚀 IMPORTACIÓN FINAL DE DATOS REALES');
console.log('='.repeat(50));

// Verificar variables de entorno
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Variables de entorno requeridas no encontradas');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importFinalData() {
  try {
    // Verificar conexión
    console.log('🔍 Verificando conexión...');
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
    const companiesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'companies.json'), 'utf8'));
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .upsert(companiesData, { onConflict: 'id' });
    
    if (companiesError) throw companiesError;
    console.log(`✅ Companies importadas: ${companies?.length || companiesData.length}`);
    
    // Importar departments
    console.log('📦 Importando departamentos...');
    const departmentsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'departments.json'), 'utf8'));
    const { data: departments, error: departmentsError } = await supabase
      .from('departments')
      .upsert(departmentsData, { onConflict: 'id' });
    
    if (departmentsError) throw departmentsError;
    console.log(`✅ Departments importados: ${departments?.length || departmentsData.length}`);
    
    // Importar employees finales
    console.log('📦 Importando empleados finales...');
    const employeesPath = path.join(__dirname, 'employees-final.json');
    if (!fs.existsSync(employeesPath)) {
      throw new Error('Archivo employees-final.json no encontrado');
    }
    
    const employeesData = JSON.parse(fs.readFileSync(employeesPath, 'utf8'));
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .upsert(employeesData, { onConflict: 'id' });
    
    if (employeesError) throw employeesError;
    console.log(`✅ Employees importados: ${employees?.length || employeesData.length}`);
    
    console.log('\n🎉 IMPORTACIÓN FINAL COMPLETADA');
    console.log('='.repeat(50));
    console.log('📊 Resumen:');
    console.log(`   - Empresas: ${companies?.length || companiesData.length}`);
    console.log(`   - Departamentos: ${departments?.length || departmentsData.length}`);
    console.log(`   - Empleados: ${employees?.length || employeesData.length}`);
    console.log('\n✅ Los datos reales están listos para usar en la aplicación');
    
  } catch (error) {
    console.error('❌ Error en importación:', error.message);
    process.exit(1);
  }
}

importFinalData();
