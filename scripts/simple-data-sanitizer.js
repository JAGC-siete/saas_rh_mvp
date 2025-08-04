#!/usr/bin/env node

/**
 * Script simplificado para saneamiento de datos
 * No requiere conexión a Supabase, solo procesa archivos locales
 */

const fs = require('fs');
const path = require('path');

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

class SimpleDataSanitizer {
  constructor() {
    this.stats = {
      processed: 0,
      errors: 0,
      warnings: 0,
      cleaned: 0
    };
    this.outputDir = path.join(__dirname, '..', 'import-data');
  }

  async init() {
    log('🧹 INICIANDO SANEAMIENTO SIMPLIFICADO DE DATOS', 'cyan');
    log('='.repeat(60), 'cyan');
    
    // Crear directorio de salida
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      log(`📁 Directorio creado: ${this.outputDir}`, 'green');
    }
  }

  // Sanear DNI (eliminar caracteres no numéricos)
  sanitizeDNI(dni) {
    if (!dni) return null;
    const clean = dni.toString().replace(/[^0-9]/g, '');
    return clean.length > 0 ? clean : null;
  }

  // Sanear nombres (capitalizar, eliminar espacios extra)
  sanitizeName(name) {
    if (!name) return null;
    return name.trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Sanear email (lowercase, trim)
  sanitizeEmail(email) {
    if (!email) return null;
    const clean = email.toLowerCase().trim();
    return clean.includes('@') ? clean : null;
  }

  // Sanear salario (convertir a número)
  sanitizeSalary(salary) {
    if (!salary) return 0;
    const num = parseFloat(salary.toString().replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : Math.max(0, num);
  }

  // Generar UUID
  generateUUID() {
    return require('crypto').randomUUID();
  }

  // Buscar archivos de empleados
  findEmployeeFiles() {
    const files = [
      'employees_202504060814.sql',
      'employees_paragon_migration.sql',
      'EJECUTAR_AHORA_employees_final.sql',
      'paragon_employees_migration.sql',
      'migration_employee_data.sql'
    ];

    const foundFiles = [];
    for (const file of files) {
      const filePath = path.join(__dirname, '..', file);
      if (fs.existsSync(filePath)) {
        foundFiles.push(filePath);
        log(`📁 Encontrado: ${file}`, 'green');
      }
    }

    return foundFiles;
  }

  // Extraer datos de empleados desde SQL
  extractEmployeesFromSQL(sqlContent) {
    const employees = [];
    
    // Buscar INSERT statements
    const insertRegex = /INSERT INTO employees\s*\([^)]+\)\s*VALUES\s*\(([^)]+)\)/gi;
    
    let match;
    while ((match = insertRegex.exec(sqlContent)) !== null) {
      try {
        const values = match[1].split(',').map(v => v.trim().replace(/['"]/g, ''));
        
        if (values.length >= 6) {
          const employee = {
            id: values[0] || this.generateUUID(),
            company_id: values[1] || this.generateUUID(),
            department_id: values[2] || null,
            dni: values[3] || null,
            first_name: values[4] || null,
            last_name: values[5] || null,
            email: values[6] || null,
            phone: values[7] || null,
            position: values[8] || 'Empleado',
            base_salary: values[9] || 0,
            hire_date: values[10] || new Date().toISOString().split('T')[0],
            status: values[11] || 'active'
          };
          employees.push(employee);
        }
      } catch (error) {
        log(`⚠️  Error parseando empleado: ${error.message}`, 'yellow');
        this.stats.errors++;
      }
    }

    return employees;
  }

  // Sanear datos de empleados
  async sanitizeEmployeeData() {
    log('\n👥 SANEANDO DATOS DE EMPLEADOS', 'yellow');
    
    const employeeFiles = this.findEmployeeFiles();
    
    if (employeeFiles.length === 0) {
      log('⚠️  No se encontraron archivos de empleados', 'yellow');
      return [];
    }

    let allEmployees = [];

    for (const filePath of employeeFiles) {
      const fileName = path.basename(filePath);
      log(`📖 Procesando: ${fileName}`, 'blue');
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const employees = this.extractEmployeesFromSQL(content);
        allEmployees = allEmployees.concat(employees);
        log(`✅ Extraídos ${employees.length} empleados de ${fileName}`, 'green');
      } catch (error) {
        log(`❌ Error procesando ${fileName}: ${error.message}`, 'red');
        this.stats.errors++;
      }
    }

    if (allEmployees.length === 0) {
      log('⚠️  No se extrajeron empleados de los archivos', 'yellow');
      return [];
    }

    // Sanear y validar empleados
    const sanitizedEmployees = allEmployees.map((emp, index) => {
      const sanitized = {
        id: emp.id || this.generateUUID(),
        company_id: emp.company_id || this.generateUUID(),
        department_id: emp.department_id || null,
        dni: this.sanitizeDNI(emp.dni),
        first_name: this.sanitizeName(emp.first_name),
        last_name: this.sanitizeName(emp.last_name),
        email: this.sanitizeEmail(emp.email),
        phone: emp.phone ? emp.phone.toString().replace(/[^0-9+]/g, '') : null,
        position: emp.position || 'Empleado',
        base_salary: this.sanitizeSalary(emp.base_salary),
        hire_date: emp.hire_date || new Date().toISOString().split('T')[0],
        status: emp.status || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Validaciones
      if (!sanitized.dni) {
        log(`⚠️  Empleado ${index + 1}: DNI inválido`, 'yellow');
        this.stats.warnings++;
      }

      if (!sanitized.first_name || !sanitized.last_name) {
        log(`⚠️  Empleado ${index + 1}: Nombre incompleto`, 'yellow');
        this.stats.warnings++;
      }

      if (!sanitized.email) {
        log(`⚠️  Empleado ${index + 1}: Email inválido`, 'yellow');
        this.stats.warnings++;
      }

      this.stats.processed++;
      return sanitized;
    });

    // Eliminar duplicados por DNI
    const uniqueEmployees = [];
    const seenDNIs = new Set();

    for (const emp of sanitizedEmployees) {
      if (emp.dni && !seenDNIs.has(emp.dni)) {
        seenDNIs.add(emp.dni);
        uniqueEmployees.push(emp);
      } else if (!emp.dni) {
        uniqueEmployees.push(emp);
      }
    }

    log(`✅ Empleados únicos: ${uniqueEmployees.length}`, 'green');
    this.stats.cleaned = sanitizedEmployees.length - uniqueEmployees.length;

    return uniqueEmployees;
  }

  // Crear datos de empresas
  createCompanyData() {
    log('\n🏢 CREANDO DATOS DE EMPRESAS', 'yellow');
    
    const companies = [
      {
        id: this.generateUUID(),
        name: 'Empresa Principal',
        subdomain: 'principal',
        plan_type: 'premium',
        settings: { timezone: 'America/Tegucigalpa' },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    log(`✅ Empresas creadas: ${companies.length}`, 'green');
    return companies;
  }

  // Crear datos de departamentos
  createDepartmentData() {
    log('\n🏢 CREANDO DATOS DE DEPARTAMENTOS', 'yellow');
    
    const departments = [
      {
        id: this.generateUUID(),
        company_id: null, // Se asignará después
        name: 'Recursos Humanos',
        description: 'Departamento de Recursos Humanos',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: this.generateUUID(),
        company_id: null,
        name: 'Tecnología',
        description: 'Departamento de Tecnología',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: this.generateUUID(),
        company_id: null,
        name: 'Administración',
        description: 'Departamento de Administración',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: this.generateUUID(),
        company_id: null,
        name: 'Ventas',
        description: 'Departamento de Ventas',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    log(`✅ Departamentos creados: ${departments.length}`, 'green');
    return departments;
  }

  // Crear archivos de importación
  async createImportFiles(companies, departments, employees) {
    log('\n📁 CREANDO ARCHIVOS DE IMPORTACIÓN', 'yellow');
    
    // Asignar company_id a departamentos
    const companyId = companies[0].id;
    departments.forEach(dept => dept.company_id = companyId);

    // Asignar company_id y department_id a empleados
    employees.forEach(emp => {
      emp.company_id = companyId;
      if (!emp.department_id) {
        emp.department_id = departments[0].id; // RH por defecto
      }
    });

    // Crear archivos JSON
    const files = [
      { name: 'companies.json', data: companies },
      { name: 'departments.json', data: departments },
      { name: 'employees.json', data: employees }
    ];

    for (const file of files) {
      const filePath = path.join(this.outputDir, file.name);
      fs.writeFileSync(filePath, JSON.stringify(file.data, null, 2));
      log(`✅ ${file.name}: ${file.data.length} registros`, 'green');
    }

    // Crear script de importación
    const importScript = this.createImportScript();
    const scriptPath = path.join(this.outputDir, 'import.js');
    fs.writeFileSync(scriptPath, importScript);
    fs.chmodSync(scriptPath, '755');
    
    log(`✅ Script de importación: ${scriptPath}`, 'green');
  }

  // Crear script de importación
  createImportScript() {
    return `#!/usr/bin/env node

/**
 * Script de importación automática de datos saneados
 * Generado por simple-data-sanitizer.js
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
    const companiesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'companies.json'), 'utf8'));
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .upsert(companiesData, { onConflict: 'id' });
    
    if (companiesError) throw companiesError;
    console.log(\`✅ Companies importadas: \${companies.length}\`);
    
    // Importar departments
    const departmentsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'departments.json'), 'utf8'));
    const { data: departments, error: departmentsError } = await supabase
      .from('departments')
      .upsert(departmentsData, { onConflict: 'id' });
    
    if (departmentsError) throw departmentsError;
    console.log(\`✅ Departments importados: \${departments.length}\`);
    
    // Importar employees
    const employeesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'employees.json'), 'utf8'));
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
  }

  // Generar reporte
  generateReport() {
    log('\n📊 REPORTE DE SANEAMIENTO', 'cyan');
    log('='.repeat(40), 'cyan');
    log(`📈 Registros procesados: ${this.stats.processed}`, 'green');
    log(`🧹 Registros limpiados: ${this.stats.cleaned}`, 'yellow');
    log(`⚠️  Advertencias: ${this.stats.warnings}`, 'yellow');
    log(`❌ Errores: ${this.stats.errors}`, 'red');
    
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      outputDir: this.outputDir,
      files: ['companies.json', 'departments.json', 'employees.json', 'import.js']
    };

    const reportPath = path.join(this.outputDir, 'import-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    log(`📄 Reporte guardado: ${reportPath}`, 'green');
  }

  async run() {
    await this.init();
    
    // Sanear datos
    const companies = this.createCompanyData();
    const departments = this.createDepartmentData();
    const employees = await this.sanitizeEmployeeData();
    
    // Crear archivos de importación
    await this.createImportFiles(companies, departments, employees);
    
    // Generar reporte
    this.generateReport();
    
    log('\n🎉 SANEAMIENTO COMPLETADO', 'green');
    log('='.repeat(60), 'green');
    log('Archivos generados en:', 'cyan');
    log(`📁 ${this.outputDir}`, 'yellow');
    log('\nPara importar los datos:', 'cyan');
    log('1. cd import-data', 'yellow');
    log('2. node import.js', 'yellow');
    log('\nNota: Asegúrate de tener las variables de entorno configuradas', 'yellow');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const sanitizer = new SimpleDataSanitizer();
  sanitizer.run().catch(error => {
    log(`❌ Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = SimpleDataSanitizer; 