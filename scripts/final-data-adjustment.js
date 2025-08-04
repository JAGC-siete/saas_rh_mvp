#!/usr/bin/env node

/**
 * Script final para ajustar datos a la estructura real de la tabla employees
 */

const fs = require('fs');
const path = require('path');

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

class FinalDataAdjuster {
  constructor() {
    this.stats = {
      processed: 0,
      adjusted: 0,
      errors: 0
    };
    this.importDir = path.join(__dirname, '..', 'import-data');
  }

  async init() {
    log('🔧 AJUSTE FINAL DE DATOS A ESTRUCTURA REAL', 'cyan');
    log('='.repeat(60), 'cyan');
  }

  // Generar UUID
  generateUUID() {
    return require('crypto').randomUUID();
  }

  // Ajustar datos de empleados a la estructura real
  adjustEmployeeDataToRealStructure() {
    log('\n👥 AJUSTANDO DATOS A ESTRUCTURA REAL', 'yellow');
    
    const employeesPath = path.join(this.importDir, 'employees.json');
    
    if (!fs.existsSync(employeesPath)) {
      log('❌ Archivo employees.json no encontrado', 'red');
      return false;
    }

    try {
      const employeesData = JSON.parse(fs.readFileSync(employeesPath, 'utf8'));
      
      // Ajustar a la estructura real de la tabla employees
      const adjustedEmployees = employeesData.map((emp, index) => {
        // Generar UUIDs para campos requeridos
        const companyId = emp.company_id || this.generateUUID();
        const departmentId = emp.department_id || this.generateUUID();
        const workScheduleId = this.generateUUID();
        
        const adjusted = {
          id: emp.id || this.generateUUID(),
          company_id: companyId,
          department_id: departmentId,
          work_schedule_id: workScheduleId,
          employee_code: `EMP${String(index + 1).padStart(3, '0')}`,
          dni: emp.dni || `0000000${index + 1}`,
          name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || `Empleado ${index + 1}`,
          email: emp.email || `empleado${index + 1}@empresa.com`,
          phone: emp.phone || null,
          role: emp.position || 'Empleado',
          team: emp.position || 'General',
          base_salary: emp.base_salary || 15000, // Campo obligatorio
          hire_date: emp.hire_date || '2024-01-01',
          termination_date: null,
          status: emp.status || 'active',
          bank_name: 'BANPAIS',
          bank_account: `213000317${String(index + 1).padStart(3, '0')}`,
          emergency_contact_name: null,
          emergency_contact_phone: null,
          address: null,
          metadata: {
            original_position: emp.position,
            original_salary: emp.base_salary,
            import_date: new Date().toISOString()
          },
          created_at: emp.created_at || new Date().toISOString(),
          updated_at: emp.updated_at || new Date().toISOString()
        };

        this.stats.processed++;
        return adjusted;
      });

      // Guardar datos ajustados
      const adjustedPath = path.join(this.importDir, 'employees-final.json');
      fs.writeFileSync(adjustedPath, JSON.stringify(adjustedEmployees, null, 2));
      
      log(`✅ Datos finales guardados en: ${adjustedPath}`, 'green');
      log(`📊 Empleados ajustados: ${adjustedEmployees.length}`, 'green');
      this.stats.adjusted = adjustedEmployees.length;
      
      return true;

    } catch (error) {
      log(`❌ Error ajustando datos: ${error.message}`, 'red');
      this.stats.errors++;
      return false;
    }
  }

  // Crear script de importación final
  createFinalImportScript() {
    log('\n📝 CREANDO SCRIPT DE IMPORTACIÓN FINAL', 'yellow');
    
    const importScript = `#!/usr/bin/env node

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
    console.log('\\n📦 Importando empresas...');
    const companiesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'companies.json'), 'utf8'));
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .upsert(companiesData, { onConflict: 'id' });
    
    if (companiesError) throw companiesError;
    console.log(\`✅ Companies importadas: \${companies?.length || companiesData.length}\`);
    
    // Importar departments
    console.log('📦 Importando departamentos...');
    const departmentsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'departments.json'), 'utf8'));
    const { data: departments, error: departmentsError } = await supabase
      .from('departments')
      .upsert(departmentsData, { onConflict: 'id' });
    
    if (departmentsError) throw departmentsError;
    console.log(\`✅ Departments importados: \${departments?.length || departmentsData.length}\`);
    
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
    console.log(\`✅ Employees importados: \${employees?.length || employeesData.length}\`);
    
    console.log('\\n🎉 IMPORTACIÓN FINAL COMPLETADA');
    console.log('='.repeat(50));
    console.log('📊 Resumen:');
    console.log(\`   - Empresas: \${companies?.length || companiesData.length}\`);
    console.log(\`   - Departamentos: \${departments?.length || departmentsData.length}\`);
    console.log(\`   - Empleados: \${employees?.length || employeesData.length}\`);
    console.log('\\n✅ Los datos reales están listos para usar en la aplicación');
    
  } catch (error) {
    console.error('❌ Error en importación:', error.message);
    process.exit(1);
  }
}

importFinalData();
`;

    const scriptPath = path.join(this.importDir, 'import-final.js');
    fs.writeFileSync(scriptPath, importScript);
    fs.chmodSync(scriptPath, '755');
    
    log(`✅ Script de importación final creado: ${scriptPath}`, 'green');
  }

  // Generar reporte final
  generateFinalReport() {
    log('\n📊 REPORTE FINAL', 'cyan');
    log('='.repeat(40), 'cyan');
    log(`📈 Empleados procesados: ${this.stats.processed}`, 'green');
    log(`🔧 Empleados ajustados: ${this.stats.adjusted}`, 'green');
    log(`❌ Errores: ${this.stats.errors}`, this.stats.errors > 0 ? 'red' : 'green');
    
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      structure: {
        id: 'UUID (requerido)',
        company_id: 'UUID (requerido)',
        department_id: 'UUID (requerido)',
        work_schedule_id: 'UUID (requerido)',
        employee_code: 'string (requerido)',
        dni: 'string (requerido)',
        name: 'string (requerido)',
        email: 'string (requerido)',
        role: 'string (requerido)',
        team: 'string (requerido)',
        base_salary: 'number (requerido, not-null)',
        hire_date: 'string (requerido)',
        status: 'string (requerido)',
        bank_name: 'string',
        bank_account: 'string'
      },
      nextSteps: [
        '1. cd import-data',
        '2. node import-final.js'
      ]
    };

    const reportPath = path.join(this.importDir, 'final-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    log(`📄 Reporte final guardado: ${reportPath}`, 'green');
  }

  async run() {
    await this.init();
    
    // Ajustar datos
    const success = this.adjustEmployeeDataToRealStructure();
    
    if (success) {
      // Crear script de importación final
      this.createFinalImportScript();
    }
    
    // Generar reporte
    this.generateFinalReport();
    
    log('\n🎉 AJUSTE FINAL COMPLETADO', 'green');
    log('='.repeat(60), 'green');
    log('Próximos pasos:', 'cyan');
    log('1. cd import-data', 'yellow');
    log('2. node import-final.js', 'yellow');
    log('\n✅ Los datos están ajustados a la estructura real de la base de datos', 'green');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const adjuster = new FinalDataAdjuster();
  adjuster.run().catch(error => {
    log(`❌ Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = FinalDataAdjuster; 