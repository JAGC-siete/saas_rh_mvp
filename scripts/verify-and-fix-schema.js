#!/usr/bin/env node

/**
 * Script para verificar y corregir la estructura de la base de datos
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

class SchemaVerifier {
  constructor() {
    this.supabase = null;
    this.stats = {
      tablesChecked: 0,
      columnsFound: 0,
      issuesFound: 0
    };
  }

  async init() {
    log('🔍 VERIFICANDO ESTRUCTURA DE BASE DE DATOS', 'cyan');
    log('='.repeat(60), 'cyan');

    // Cargar variables de entorno
    const envFiles = ['.env.local', '.env', '.env.example'];
    let envVars = {};

    for (const file of envFiles) {
      if (fs.existsSync(file)) {
        const envContent = fs.readFileSync(file, 'utf8');
        envContent.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            if (value && !key.startsWith('#')) {
              envVars[key.trim()] = value.replace(/^["']|["']$/g, '');
            }
          }
        });
        break;
      }
    }

    if (!envVars.NEXT_PUBLIC_SUPABASE_URL || !envVars.SUPABASE_SERVICE_ROLE_KEY) {
      log('❌ Variables de entorno no encontradas', 'red');
      process.exit(1);
    }

    this.supabase = createClient(
      envVars.NEXT_PUBLIC_SUPABASE_URL,
      envVars.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  // Verificar estructura de tabla employees
  async checkEmployeesTable() {
    log('\n👥 VERIFICANDO TABLA EMPLOYEES', 'yellow');
    
    try {
      // Intentar obtener información de la tabla
      const { data: employees, error } = await this.supabase
        .from('employees')
        .select('*')
        .limit(1);

      if (error) {
        log(`❌ Error accediendo a tabla employees: ${error.message}`, 'red');
        this.stats.issuesFound++;
        return false;
      }

      // Si no hay datos, intentar insertar uno de prueba para ver la estructura
      if (!employees || employees.length === 0) {
        log('ℹ️  Tabla employees está vacía, verificando estructura...', 'yellow');
        
        const testEmployee = {
          id: '00000000-0000-0000-0000-000000000000',
          company_id: '00000000-0000-0000-0000-000000000000',
          department_id: '00000000-0000-0000-0000-000000000000',
          dni: '12345678',
          name: 'Test Employee',
          email: 'test@example.com',
          position: 'Test Position',
          base_salary: 1000,
          hire_date: '2024-01-01',
          status: 'active'
        };

        const { error: insertError } = await this.supabase
          .from('employees')
          .insert(testEmployee);

        if (insertError) {
          log(`❌ Error insertando empleado de prueba: ${insertError.message}`, 'red');
          this.stats.issuesFound++;
          return false;
        }

        // Limpiar el empleado de prueba
        await this.supabase
          .from('employees')
          .delete()
          .eq('id', '00000000-0000-0000-0000-000000000000');

        log('✅ Estructura de tabla employees verificada', 'green');
        this.stats.tablesChecked++;
        return true;
      }

      log('✅ Tabla employees accesible', 'green');
      this.stats.tablesChecked++;
      return true;

    } catch (error) {
      log(`❌ Error verificando tabla employees: ${error.message}`, 'red');
      this.stats.issuesFound++;
      return false;
    }
  }

  // Ajustar datos de empleados según la estructura real
  async adjustEmployeeData() {
    log('\n🔧 AJUSTANDO DATOS DE EMPLEADOS', 'yellow');
    
    const employeesPath = path.join(__dirname, '..', 'import-data', 'employees.json');
    
    if (!fs.existsSync(employeesPath)) {
      log('❌ Archivo employees.json no encontrado', 'red');
      return false;
    }

    try {
      const employeesData = JSON.parse(fs.readFileSync(employeesPath, 'utf8'));
      
      // Ajustar estructura según la tabla real
      const adjustedEmployees = employeesData.map(emp => {
        // Si la tabla usa 'name' en lugar de 'first_name' + 'last_name'
        const adjusted = {
          id: emp.id,
          company_id: emp.company_id,
          department_id: emp.department_id,
          dni: emp.dni,
          name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
          email: emp.email,
          position: emp.position,
          base_salary: emp.base_salary,
          hire_date: emp.hire_date,
          status: emp.status,
          created_at: emp.created_at,
          updated_at: emp.updated_at
        };

        // Remover campos que no existen en la tabla
        delete adjusted.first_name;
        delete adjusted.last_name;
        delete adjusted.phone;

        return adjusted;
      });

      // Guardar datos ajustados
      const adjustedPath = path.join(__dirname, '..', 'import-data', 'employees-adjusted.json');
      fs.writeFileSync(adjustedPath, JSON.stringify(adjustedEmployees, null, 2));
      
      log(`✅ Datos ajustados guardados en: ${adjustedPath}`, 'green');
      log(`📊 Empleados ajustados: ${adjustedEmployees.length}`, 'green');
      
      return true;

    } catch (error) {
      log(`❌ Error ajustando datos: ${error.message}`, 'red');
      return false;
    }
  }

  // Crear script de importación ajustado
  createAdjustedImportScript() {
    log('\n📝 CREANDO SCRIPT DE IMPORTACIÓN AJUSTADO', 'yellow');
    
    const importScript = `#!/usr/bin/env node

/**
 * Script de importación ajustado para la estructura real de la base de datos
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config();

console.log('🚀 IMPORTACIÓN AJUSTADA DE DATOS');
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

async function importAdjustedData() {
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
    
    // Importar employees ajustados
    console.log('📦 Importando empleados ajustados...');
    const employeesPath = path.join(__dirname, 'employees-adjusted.json');
    if (!fs.existsSync(employeesPath)) {
      throw new Error('Archivo employees-adjusted.json no encontrado');
    }
    
    const employeesData = JSON.parse(fs.readFileSync(employeesPath, 'utf8'));
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .upsert(employeesData, { onConflict: 'id' });
    
    if (employeesError) throw employeesError;
    console.log(\`✅ Employees importados: \${employees?.length || employeesData.length}\`);
    
    console.log('\\n🎉 IMPORTACIÓN AJUSTADA COMPLETADA');
    console.log('='.repeat(50));
    console.log('📊 Resumen:');
    console.log(\`   - Empresas: \${companies?.length || companiesData.length}\`);
    console.log(\`   - Departamentos: \${departments?.length || departmentsData.length}\`);
    console.log(\`   - Empleados: \${employees?.length || employeesData.length}\`);
    console.log('\\n✅ Los datos están listos para usar');
    
  } catch (error) {
    console.error('❌ Error en importación:', error.message);
    process.exit(1);
  }
}

importAdjustedData();
`;

    const scriptPath = path.join(__dirname, '..', 'import-data', 'import-adjusted.js');
    fs.writeFileSync(scriptPath, importScript);
    fs.chmodSync(scriptPath, '755');
    
    log(`✅ Script de importación ajustado creado: ${scriptPath}`, 'green');
  }

  // Generar reporte
  generateReport() {
    log('\n📊 REPORTE DE VERIFICACIÓN', 'cyan');
    log('='.repeat(40), 'cyan');
    log(`📋 Tablas verificadas: ${this.stats.tablesChecked}`, 'green');
    log(`🔧 Problemas encontrados: ${this.stats.issuesFound}`, this.stats.issuesFound > 0 ? 'red' : 'green');
    
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      nextSteps: [
        '1. cd import-data',
        '2. node import-adjusted.js'
      ]
    };

    const reportPath = path.join(__dirname, '..', 'import-data', 'schema-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    log(`📄 Reporte guardado: ${reportPath}`, 'green');
  }

  async run() {
    await this.init();
    
    // Verificar estructura
    const employeesOk = await this.checkEmployeesTable();
    
    if (employeesOk) {
      // Ajustar datos
      await this.adjustEmployeeData();
      this.createAdjustedImportScript();
    }
    
    // Generar reporte
    this.generateReport();
    
    log('\n🎉 VERIFICACIÓN COMPLETADA', 'green');
    log('='.repeat(60), 'green');
    log('Próximos pasos:', 'cyan');
    log('1. cd import-data', 'yellow');
    log('2. node import-adjusted.js', 'yellow');
    log('\n✅ Los datos han sido ajustados a la estructura real', 'green');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const verifier = new SchemaVerifier();
  verifier.run().catch(error => {
    log(`❌ Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = SchemaVerifier; 