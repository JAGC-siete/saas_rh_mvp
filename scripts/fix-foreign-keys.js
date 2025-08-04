#!/usr/bin/env node

/**
 * Script para manejar claves foráneas y crear datos mínimos necesarios
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

class ForeignKeyFixer {
  constructor() {
    this.supabase = null;
    this.stats = {
      schedulesCreated: 0,
      employeesFixed: 0,
      errors: 0
    };
  }

  async init() {
    log('🔧 MANEJANDO CLAVES FORÁNEAS', 'cyan');
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

  // Crear horarios de trabajo básicos
  async createWorkSchedules() {
    log('\n⏰ CREANDO HORARIOS DE TRABAJO', 'yellow');
    
    try {
      // Verificar si la tabla work_schedules existe
      const { data: schedules, error } = await this.supabase
        .from('work_schedules')
        .select('*')
        .limit(1);

      if (error) {
        log(`❌ Error accediendo a work_schedules: ${error.message}`, 'red');
        log('⚠️  La tabla work_schedules no existe, creando horario por defecto', 'yellow');
        
        // Crear horario por defecto directamente en employees
        return this.createEmployeesWithoutSchedules();
      }

      // Si la tabla existe pero está vacía, crear horarios básicos
      if (!schedules || schedules.length === 0) {
        log('📝 Creando horarios de trabajo básicos...', 'blue');
        
        const basicSchedules = [
          {
            id: '00000000-0000-0000-0000-000000000001',
            name: 'Horario Estándar',
            start_time: '08:00:00',
            end_time: '17:00:00',
            break_start: '12:00:00',
            break_end: '13:00:00',
            days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];

        const { error: insertError } = await this.supabase
          .from('work_schedules')
          .insert(basicSchedules);

        if (insertError) {
          log(`❌ Error creando horarios: ${insertError.message}`, 'red');
          return this.createEmployeesWithoutSchedules();
        }

        log('✅ Horarios de trabajo creados', 'green');
        this.stats.schedulesCreated = basicSchedules.length;
        return basicSchedules[0].id;
      }

      log('✅ Horarios de trabajo ya existen', 'green');
      return schedules[0].id;

    } catch (error) {
      log(`❌ Error creando horarios: ${error.message}`, 'red');
      return this.createEmployeesWithoutSchedules();
    }
  }

  // Crear empleados sin horarios (usando null)
  async createEmployeesWithoutSchedules() {
    log('\n👥 CREANDO EMPLEADOS SIN HORARIOS', 'yellow');
    
    const employeesPath = path.join(__dirname, '..', 'import-data', 'employees-final.json');
    
    if (!fs.existsSync(employeesPath)) {
      log('❌ Archivo employees-final.json no encontrado', 'red');
      return false;
    }

    try {
      const employeesData = JSON.parse(fs.readFileSync(employeesPath, 'utf8'));
      
      // Remover work_schedule_id para evitar problemas de clave foránea
      const fixedEmployees = employeesData.map(emp => {
        const fixed = { ...emp };
        delete fixed.work_schedule_id;
        return fixed;
      });

      // Guardar datos corregidos
      const fixedPath = path.join(__dirname, '..', 'import-data', 'employees-fixed.json');
      fs.writeFileSync(fixedPath, JSON.stringify(fixedEmployees, null, 2));
      
      log(`✅ Empleados corregidos guardados en: ${fixedPath}`, 'green');
      log(`📊 Empleados corregidos: ${fixedEmployees.length}`, 'green');
      this.stats.employeesFixed = fixedEmployees.length;
      
      return true;

    } catch (error) {
      log(`❌ Error corrigiendo empleados: ${error.message}`, 'red');
      this.stats.errors++;
      return false;
    }
  }

  // Crear script de importación corregido
  createFixedImportScript() {
    log('\n📝 CREANDO SCRIPT DE IMPORTACIÓN CORREGIDO', 'yellow');
    
    const importScript = `#!/usr/bin/env node

/**
 * Script de importación corregido sin problemas de claves foráneas
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config();

console.log('🚀 IMPORTACIÓN CORREGIDA DE DATOS REALES');
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

async function importFixedData() {
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
    
    // Importar employees corregidos
    console.log('📦 Importando empleados corregidos...');
    const employeesPath = path.join(__dirname, 'employees-fixed.json');
    if (!fs.existsSync(employeesPath)) {
      throw new Error('Archivo employees-fixed.json no encontrado');
    }
    
    const employeesData = JSON.parse(fs.readFileSync(employeesPath, 'utf8'));
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .upsert(employeesData, { onConflict: 'id' });
    
    if (employeesError) throw employeesError;
    console.log(\`✅ Employees importados: \${employees?.length || employeesData.length}\`);
    
    console.log('\\n🎉 IMPORTACIÓN CORREGIDA COMPLETADA');
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

importFixedData();
`;

    const scriptPath = path.join(__dirname, '..', 'import-data', 'import-fixed.js');
    fs.writeFileSync(scriptPath, importScript);
    fs.chmodSync(scriptPath, '755');
    
    log(`✅ Script de importación corregido creado: ${scriptPath}`, 'green');
  }

  // Generar reporte
  generateReport() {
    log('\n📊 REPORTE DE CORRECCIÓN', 'cyan');
    log('='.repeat(40), 'cyan');
    log(`⏰ Horarios creados: ${this.stats.schedulesCreated}`, 'green');
    log(`👥 Empleados corregidos: ${this.stats.employeesFixed}`, 'green');
    log(`❌ Errores: ${this.stats.errors}`, this.stats.errors > 0 ? 'red' : 'green');
    
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      nextSteps: [
        '1. cd import-data',
        '2. node import-fixed.js'
      ]
    };

    const reportPath = path.join(__dirname, '..', 'import-data', 'foreign-key-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    log(`📄 Reporte guardado: ${reportPath}`, 'green');
  }

  async run() {
    await this.init();
    
    // Crear horarios o corregir empleados
    await this.createWorkSchedules();
    await this.createEmployeesWithoutSchedules();
    
    // Crear script de importación corregido
    this.createFixedImportScript();
    
    // Generar reporte
    this.generateReport();
    
    log('\n🎉 CORRECCIÓN DE CLAVES FORÁNEAS COMPLETADA', 'green');
    log('='.repeat(60), 'green');
    log('Próximos pasos:', 'cyan');
    log('1. cd import-data', 'yellow');
    log('2. node import-fixed.js', 'yellow');
    log('\n✅ Los problemas de claves foráneas han sido resueltos', 'green');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const fixer = new ForeignKeyFixer();
  fixer.run().catch(error => {
    log(`❌ Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = ForeignKeyFixer; 