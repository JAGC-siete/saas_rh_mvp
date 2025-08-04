#!/usr/bin/env node

/**
 * Script mejorado para saneamiento de datos
 * Genera datos de ejemplo realistas para importación
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

class ImprovedDataSanitizer {
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
    log('🚀 INICIANDO SANEAMIENTO MEJORADO DE DATOS', 'cyan');
    log('='.repeat(60), 'cyan');
    
    // Crear directorio de salida
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      log(`📁 Directorio creado: ${this.outputDir}`, 'green');
    }
  }

  // Generar UUID
  generateUUID() {
    return require('crypto').randomUUID();
  }

  // Generar DNI válido
  generateDNI() {
    return Math.floor(Math.random() * 90000000) + 10000000; // 8 dígitos
  }

  // Generar email basado en nombre
  generateEmail(firstName, lastName) {
    const cleanFirstName = firstName.toLowerCase().replace(/[^a-z]/g, '');
    const cleanLastName = lastName.toLowerCase().replace(/[^a-z]/g, '');
    return `${cleanFirstName}.${cleanLastName}@empresa.com`;
  }

  // Generar teléfono
  generatePhone() {
    return `+504${Math.floor(Math.random() * 90000000) + 10000000}`;
  }

  // Crear datos de empresas
  createCompanyData() {
    log('\n🏢 CREANDO DATOS DE EMPRESAS', 'yellow');
    
    const companies = [
      {
        id: this.generateUUID(),
        name: 'TechCorp Solutions',
        subdomain: 'techcorp',
        plan_type: 'premium',
        settings: { 
          timezone: 'America/Tegucigalpa',
          currency: 'HNL',
          language: 'es'
        },
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
        description: 'Gestión de personal y desarrollo organizacional',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: this.generateUUID(),
        company_id: null,
        name: 'Tecnología',
        description: 'Desarrollo de software e infraestructura IT',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: this.generateUUID(),
        company_id: null,
        name: 'Administración',
        description: 'Gestión financiera y administrativa',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: this.generateUUID(),
        company_id: null,
        name: 'Ventas',
        description: 'Comercialización y atención al cliente',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: this.generateUUID(),
        company_id: null,
        name: 'Marketing',
        description: 'Estrategias de marketing y comunicación',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    log(`✅ Departamentos creados: ${departments.length}`, 'green');
    return departments;
  }

  // Crear datos de empleados de ejemplo
  createEmployeeData(companyId, departments) {
    log('\n👥 CREANDO DATOS DE EMPLEADOS DE EJEMPLO', 'yellow');
    
    const sampleEmployees = [
      {
        first_name: 'Juan Carlos',
        last_name: 'García López',
        position: 'Gerente de Recursos Humanos',
        base_salary: 45000,
        department: 'Recursos Humanos'
      },
      {
        first_name: 'María Elena',
        last_name: 'Rodríguez Martínez',
        position: 'Desarrollador Senior',
        base_salary: 55000,
        department: 'Tecnología'
      },
      {
        first_name: 'Carlos Alberto',
        last_name: 'Hernández Flores',
        position: 'Contador',
        base_salary: 35000,
        department: 'Administración'
      },
      {
        first_name: 'Ana Sofía',
        last_name: 'Pérez Mendoza',
        position: 'Ejecutiva de Ventas',
        base_salary: 30000,
        department: 'Ventas'
      },
      {
        first_name: 'Luis Fernando',
        last_name: 'Morales Vega',
        position: 'Especialista en Marketing',
        base_salary: 32000,
        department: 'Marketing'
      },
      {
        first_name: 'Diana Patricia',
        last_name: 'Castro Ruiz',
        position: 'Desarrollador Frontend',
        base_salary: 48000,
        department: 'Tecnología'
      },
      {
        first_name: 'Roberto José',
        last_name: 'Sánchez Díaz',
        position: 'Analista de Datos',
        base_salary: 42000,
        department: 'Tecnología'
      },
      {
        first_name: 'Carmen Rosa',
        last_name: 'Vargas Torres',
        position: 'Asistente Administrativa',
        base_salary: 25000,
        department: 'Administración'
      },
      {
        first_name: 'Francisco Javier',
        last_name: 'Mendoza López',
        position: 'Representante de Ventas',
        base_salary: 28000,
        department: 'Ventas'
      },
      {
        first_name: 'Laura Beatriz',
        last_name: 'González Silva',
        position: 'Coordinadora de RRHH',
        base_salary: 38000,
        department: 'Recursos Humanos'
      }
    ];

    const employees = sampleEmployees.map((emp, index) => {
      // Encontrar el departamento correspondiente
      const department = departments.find(d => d.name === emp.department);
      
      const employee = {
        id: this.generateUUID(),
        company_id: companyId,
        department_id: department ? department.id : departments[0].id,
        dni: this.generateDNI(),
        first_name: emp.first_name,
        last_name: emp.last_name,
        email: this.generateEmail(emp.first_name, emp.last_name),
        phone: this.generatePhone(),
        position: emp.position,
        base_salary: emp.base_salary,
        hire_date: this.generateHireDate(),
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      this.stats.processed++;
      return employee;
    });

    log(`✅ Empleados creados: ${employees.length}`, 'green');
    return employees;
  }

  // Generar fecha de contratación aleatoria
  generateHireDate() {
    const start = new Date(2020, 0, 1);
    const end = new Date();
    const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return randomDate.toISOString().split('T')[0];
  }

  // Crear archivos de importación
  async createImportFiles(companies, departments, employees) {
    log('\n📁 CREANDO ARCHIVOS DE IMPORTACIÓN', 'yellow');
    
    // Asignar company_id a departamentos
    const companyId = companies[0].id;
    departments.forEach(dept => dept.company_id = companyId);

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

    // Crear script de importación mejorado
    const importScript = this.createImportScript();
    const scriptPath = path.join(this.outputDir, 'import.js');
    fs.writeFileSync(scriptPath, importScript);
    fs.chmodSync(scriptPath, '755');
    
    log(`✅ Script de importación: ${scriptPath}`, 'green');
  }

  // Crear script de importación mejorado
  createImportScript() {
    return `#!/usr/bin/env node

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
    console.log(\`✅ Companies importadas: \${companies.length}\`);
    
    // Importar departments
    console.log('📦 Importando departamentos...');
    const departmentsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'departments.json'), 'utf8'));
    const { data: departments, error: departmentsError } = await supabase
      .from('departments')
      .upsert(departmentsData, { onConflict: 'id' });
    
    if (departmentsError) throw departmentsError;
    console.log(\`✅ Departments importados: \${departments.length}\`);
    
    // Importar employees
    console.log('📦 Importando empleados...');
    const employeesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'employees.json'), 'utf8'));
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .upsert(employeesData, { onConflict: 'id' });
    
    if (employeesError) throw employeesError;
    console.log(\`✅ Employees importados: \${employees.length}\`);
    
    console.log('🎉 Importación completada exitosamente');
    console.log('📊 Resumen:');
    console.log(\`   - Empresas: \${companies.length}\`);
    console.log(\`   - Departamentos: \${departments.length}\`);
    console.log(\`   - Empleados: \${employees.length}\`);
    
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
      files: ['companies.json', 'departments.json', 'employees.json', 'import.js'],
      description: 'Datos de ejemplo generados para importación a Supabase'
    };

    const reportPath = path.join(this.outputDir, 'import-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    log(`📄 Reporte guardado: ${reportPath}`, 'green');
  }

  async run() {
    await this.init();
    
    // Crear datos
    const companies = this.createCompanyData();
    const departments = this.createDepartmentData();
    const employees = this.createEmployeeData(companies[0].id, departments);
    
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
    log('Variables requeridas:', 'cyan');
    log('- NEXT_PUBLIC_SUPABASE_URL', 'yellow');
    log('- SUPABASE_SERVICE_ROLE_KEY', 'yellow');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const sanitizer = new ImprovedDataSanitizer();
  sanitizer.run().catch(error => {
    log(`❌ Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = ImprovedDataSanitizer; 