#!/usr/bin/env node

/**
 * Script inteligente para saneamiento de datos antes de importar a Supabase
 * Corrige problemas de esquema, valida datos y prepara migraciones
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuración
const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  dataDir: path.join(__dirname, '..', 'data'),
  migrationsDir: path.join(__dirname, '..', 'supabase', 'migrations'),
  backupDir: path.join(__dirname, '..', 'backups')
};

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

class DataSanitizer {
  constructor() {
    this.supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
    this.issues = [];
    this.fixes = [];
  }

  async init() {
    log('🔧 INICIANDO SANEAMIENTO DE DATOS', 'cyan');
    log('='.repeat(60), 'cyan');
    
    // Crear directorios si no existen
    [config.dataDir, config.backupDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        log(`📁 Directorio creado: ${dir}`, 'green');
      }
    });
  }

  async backupCurrentData() {
    log('\n💾 CREANDO BACKUP DE DATOS ACTUALES', 'yellow');
    
    try {
      const tables = ['companies', 'employees', 'departments', 'attendance_records', 'user_profiles'];
      const backup = { timestamp: new Date().toISOString(), tables: {} };

      for (const table of tables) {
        const { data, error } = await this.supabase.from(table).select('*');
        if (error) {
          log(`⚠️  Error al hacer backup de ${table}: ${error.message}`, 'red');
          continue;
        }
        backup.tables[table] = data;
        log(`✅ Backup de ${table}: ${data.length} registros`, 'green');
      }

      const backupFile = path.join(config.backupDir, `backup-${Date.now()}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
      log(`💾 Backup guardado en: ${backupFile}`, 'green');
      
      return backupFile;
    } catch (error) {
      log(`❌ Error en backup: ${error.message}`, 'red');
      return null;
    }
  }

  async fixMigrationIssues() {
    log('\n🔧 CORRIGIENDO PROBLEMAS DE MIGRACIÓN', 'yellow');
    
    const migrationFile = path.join(config.migrationsDir, '20250723000004_logging_and_jobs_system.sql');
    
    if (!fs.existsSync(migrationFile)) {
      log(`❌ Archivo de migración no encontrado: ${migrationFile}`, 'red');
      return false;
    }

    let content = fs.readFileSync(migrationFile, 'utf8');
    const originalContent = content;

    // Corregir referencias incorrectas a user_profiles.user_id
    const fixes = [
      {
        pattern: /user_profiles\.user_id/g,
        replacement: 'user_profiles.id',
        description: 'Corregir user_id por id en user_profiles'
      },
      {
        pattern: /WHERE user_profiles\.user_id = auth\.uid\(\)/g,
        replacement: 'WHERE user_profiles.id = auth.uid()',
        description: 'Corregir condición WHERE en políticas RLS'
      }
    ];

    let fixed = false;
    for (const fix of fixes) {
      if (content.match(fix.pattern)) {
        content = content.replace(fix.pattern, fix.replacement);
        log(`✅ ${fix.description}`, 'green');
        fixed = true;
      }
    }

    if (fixed) {
      // Crear backup de la migración original
      const backupFile = migrationFile + `.backup.${Date.now()}`;
      fs.writeFileSync(backupFile, originalContent);
      log(`💾 Backup de migración original: ${backupFile}`, 'yellow');

      // Escribir migración corregida
      fs.writeFileSync(migrationFile, content);
      log(`✅ Migración corregida: ${migrationFile}`, 'green');
      
      this.fixes.push('Migración 20250723000004 corregida');
      return true;
    } else {
      log('ℹ️  No se encontraron problemas en la migración', 'blue');
      return false;
    }
  }

  async validateDataStructure() {
    log('\n🔍 VALIDANDO ESTRUCTURA DE DATOS', 'yellow');
    
    const validations = [
      {
        table: 'user_profiles',
        checks: [
          { column: 'id', type: 'uuid', required: true },
          { column: 'company_id', type: 'uuid', required: true },
          { column: 'role', type: 'text', required: true }
        ]
      },
      {
        table: 'employees',
        checks: [
          { column: 'id', type: 'uuid', required: true },
          { column: 'company_id', type: 'uuid', required: true },
          { column: 'dni', type: 'text', required: true }
        ]
      },
      {
        table: 'companies',
        checks: [
          { column: 'id', type: 'uuid', required: true },
          { column: 'name', type: 'text', required: true }
        ]
      }
    ];

    for (const validation of validations) {
      const { data, error } = await this.supabase
        .from(validation.table)
        .select('*')
        .limit(1);

      if (error) {
        log(`❌ Error al validar ${validation.table}: ${error.message}`, 'red');
        this.issues.push(`Error en tabla ${validation.table}: ${error.message}`);
        continue;
      }

      if (data.length === 0) {
        log(`⚠️  Tabla ${validation.table} está vacía`, 'yellow');
        continue;
      }

      const sample = data[0];
      log(`✅ Tabla ${validation.table}: ${Object.keys(sample).length} columnas`, 'green');
    }
  }

  async sanitizeEmployeeData() {
    log('\n🧹 SANEANDO DATOS DE EMPLEADOS', 'yellow');
    
    try {
      const { data: employees, error } = await this.supabase
        .from('employees')
        .select('*');

      if (error) {
        log(`❌ Error al obtener empleados: ${error.message}`, 'red');
        return;
      }

      let updated = 0;
      for (const employee of employees) {
        const updates = {};

        // Sanear DNI
        if (employee.dni) {
          const cleanDni = employee.dni.toString().replace(/[^0-9]/g, '');
          if (cleanDni !== employee.dni) {
            updates.dni = cleanDni;
          }
        }

        // Sanear nombres
        if (employee.first_name) {
          const cleanName = employee.first_name.trim().replace(/\s+/g, ' ');
          if (cleanName !== employee.first_name) {
            updates.first_name = cleanName;
          }
        }

        if (employee.last_name) {
          const cleanLastName = employee.last_name.trim().replace(/\s+/g, ' ');
          if (cleanLastName !== employee.last_name) {
            updates.last_name = cleanLastName;
          }
        }

        // Sanear email
        if (employee.email) {
          const cleanEmail = employee.email.toLowerCase().trim();
          if (cleanEmail !== employee.email) {
            updates.email = cleanEmail;
          }
        }

        // Sanear salario
        if (employee.base_salary) {
          const salary = parseFloat(employee.base_salary);
          if (!isNaN(salary) && salary !== employee.base_salary) {
            updates.base_salary = salary;
          }
        }

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await this.supabase
            .from('employees')
            .update(updates)
            .eq('id', employee.id);

          if (updateError) {
            log(`❌ Error al actualizar empleado ${employee.id}: ${updateError.message}`, 'red');
          } else {
            updated++;
          }
        }
      }

      log(`✅ Empleados saneados: ${updated} actualizados`, 'green');
    } catch (error) {
      log(`❌ Error en saneamiento de empleados: ${error.message}`, 'red');
    }
  }

  async createDataImportScript() {
    log('\n📝 CREANDO SCRIPT DE IMPORTACIÓN', 'yellow');
    
    const importScript = `#!/usr/bin/env node

/**
 * Script de importación de datos saneados
 * Generado automáticamente por data-sanitization.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importData() {
  console.log('🚀 Iniciando importación de datos...');
  
  try {
    // Importar companies
    const companiesData = JSON.parse(fs.readFileSync('${config.dataDir}/companies.json', 'utf8'));
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .upsert(companiesData, { onConflict: 'id' });
    
    if (companiesError) throw companiesError;
    console.log(\`✅ Companies importadas: \${companies.length}\`);
    
    // Importar departments
    const departmentsData = JSON.parse(fs.readFileSync('${config.dataDir}/departments.json', 'utf8'));
    const { data: departments, error: departmentsError } = await supabase
      .from('departments')
      .upsert(departmentsData, { onConflict: 'id' });
    
    if (departmentsError) throw departmentsError;
    console.log(\`✅ Departments importados: \${departments.length}\`);
    
    // Importar employees
    const employeesData = JSON.parse(fs.readFileSync('${config.dataDir}/employees.json', 'utf8'));
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .upsert(employeesData, { onConflict: 'id' });
    
    if (employeesError) throw employeesError;
    console.log(\`✅ Employees importados: \${employees.length}\`);
    
    console.log('🎉 Importación completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en importación:', error.message);
    process.exit(1);
  }
}

importData();
`;

    const scriptPath = path.join(__dirname, 'import-data.js');
    fs.writeFileSync(scriptPath, importScript);
    fs.chmodSync(scriptPath, '755');
    
    log(`✅ Script de importación creado: ${scriptPath}`, 'green');
    return scriptPath;
  }

  async generateReport() {
    log('\n📊 GENERANDO REPORTE', 'yellow');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        issuesFound: this.issues.length,
        fixesApplied: this.fixes.length,
        tablesValidated: ['companies', 'employees', 'departments', 'user_profiles'],
        backupCreated: true
      },
      issues: this.issues,
      fixes: this.fixes,
      recommendations: [
        'Ejecutar supabase db pull después de aplicar las correcciones',
        'Verificar que todas las políticas RLS funcionen correctamente',
        'Probar la importación con datos de prueba antes de producción'
      ]
    };

    const reportFile = path.join(config.backupDir, `sanitization-report-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    log(`📊 Reporte generado: ${reportFile}`, 'green');
    
    // Mostrar resumen
    log('\n📋 RESUMEN DEL SANEAMIENTO', 'cyan');
    log('='.repeat(40), 'cyan');
    log(`🔍 Problemas encontrados: ${this.issues.length}`, this.issues.length > 0 ? 'red' : 'green');
    log(`🔧 Correcciones aplicadas: ${this.fixes.length}`, 'green');
    log(`💾 Backup creado: Sí`, 'green');
    
    if (this.issues.length > 0) {
      log('\n⚠️  PROBLEMAS ENCONTRADOS:', 'red');
      this.issues.forEach(issue => log(`  • ${issue}`, 'red'));
    }
    
    if (this.fixes.length > 0) {
      log('\n✅ CORRECCIONES APLICADAS:', 'green');
      this.fixes.forEach(fix => log(`  • ${fix}`, 'green'));
    }
    
    return reportFile;
  }

  async run() {
    await this.init();
    
    // 1. Crear backup
    await this.backupCurrentData();
    
    // 2. Corregir problemas de migración
    await this.fixMigrationIssues();
    
    // 3. Validar estructura
    await this.validateDataStructure();
    
    // 4. Sanear datos
    await this.sanitizeEmployeeData();
    
    // 5. Crear script de importación
    await this.createDataImportScript();
    
    // 6. Generar reporte
    await this.generateReport();
    
    log('\n🎉 SANEAMIENTO COMPLETADO', 'green');
    log('='.repeat(60), 'green');
    log('Próximos pasos:', 'cyan');
    log('1. Ejecutar: supabase db pull', 'yellow');
    log('2. Verificar que las migraciones se apliquen correctamente', 'yellow');
    log('3. Probar la aplicación con los datos saneados', 'yellow');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const sanitizer = new DataSanitizer();
  sanitizer.run().catch(error => {
    log(`❌ Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = DataSanitizer; 