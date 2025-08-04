#!/usr/bin/env node

/**
 * Script de importación automática de datos saneados
 * Generado por improved-data-sanitizer.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importData() {
  console.log('🚀 Iniciando importación de datos saneados...');
  
  try {
    // Importar companies
    console.log('📦 Importando empresas...');
    const companiesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'companies.json'), 'utf8'));
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .upsert(companiesData, { onConflict: 'id' });
    
    if (companiesError) throw companiesError;
    console.log(`✅ Companies importadas: ${companies.length}`);
    
    // Importar departments
    console.log('📦 Importando departamentos...');
    const departmentsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'departments.json'), 'utf8'));
    const { data: departments, error: departmentsError } = await supabase
      .from('departments')
      .upsert(departmentsData, { onConflict: 'id' });
    
    if (departmentsError) throw departmentsError;
    console.log(`✅ Departments importados: ${departments.length}`);
    
    // Importar employees
    console.log('📦 Importando empleados...');
    const employeesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'employees.json'), 'utf8'));
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .upsert(employeesData, { onConflict: 'id' });
    
    if (employeesError) throw employeesError;
    console.log(`✅ Employees importados: ${employees.length}`);
    
    console.log('🎉 Importación completada exitosamente');
    console.log('📊 Resumen:');
    console.log(`   - Empresas: ${companies.length}`);
    console.log(`   - Departamentos: ${departments.length}`);
    console.log(`   - Empleados: ${employees.length}`);
    
  } catch (error) {
    console.error('❌ Error en importación:', error.message);
    process.exit(1);
  }
}

importData();
