#!/usr/bin/env node

/**
 * Script para procesar datos reales de empleados
 * Convierte los datos proporcionados al formato requerido por Supabase
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

class RealEmployeeDataProcessor {
  constructor() {
    this.stats = {
      processed: 0,
      errors: 0,
      warnings: 0
    };
    this.outputDir = path.join(__dirname, '..', 'import-data');
  }

  async init() {
    log('👥 PROCESANDO DATOS REALES DE EMPLEADOS', 'cyan');
    log('='.repeat(60), 'cyan');
  }

  // Generar UUID
  generateUUID() {
    return require('crypto').randomUUID();
  }

  // Sanear DNI (eliminar guiones y espacios)
  sanitizeDNI(dni) {
    if (!dni) return null;
    return dni.toString().replace(/[^0-9]/g, '');
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

  // Convertir fecha de formato USA a ISO
  convertDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    try {
      // Manejar diferentes formatos de fecha
      const cleanDate = dateStr.replace(/[^0-9\/\-]/g, '');
      
      if (cleanDate.includes('/')) {
        const parts = cleanDate.split('/');
        if (parts.length === 3) {
          const month = parseInt(parts[0]) - 1;
          const day = parseInt(parts[1]);
          const year = parseInt(parts[2]);
          
          // Manejar años de 2 dígitos
          const fullYear = year < 100 ? 2000 + year : year;
          
          const date = new Date(fullYear, month, day);
          return date.toISOString().split('T')[0];
        }
      } else if (cleanDate.includes('-')) {
        const parts = cleanDate.split('-');
        if (parts.length === 3) {
          const month = parseInt(parts[0]) - 1;
          const day = parseInt(parts[1]);
          const year = parseInt(parts[2]);
          
          const fullYear = year < 100 ? 2000 + year : year;
          
          const date = new Date(fullYear, month, day);
          return date.toISOString().split('T')[0];
        }
      }
    } catch (error) {
      log(`⚠️  Error convirtiendo fecha: ${dateStr}`, 'yellow');
    }
    
    return new Date().toISOString().split('T')[0];
  }

  // Mapear departamentos
  mapDepartment(department) {
    const departmentMap = {
      'PROCESSING': 'Procesamiento',
      'DATA ENTRY': 'Entrada de Datos',
      'COMPLIANCE': 'Cumplimiento',
      'NEGOTIATION': 'Negociación',
      'Customer Service': 'Servicio al Cliente',
      'MANAGER': 'Gerencia',
      'HR': 'Recursos Humanos',
      'INSURANCE': 'Seguros'
    };
    
    return departmentMap[department] || department;
  }

  // Procesar datos de empleados
  processEmployeeData() {
    log('\n📊 PROCESANDO DATOS DE EMPLEADOS', 'yellow');
    
    const rawData = [
      {
        name: 'Ericka Daniela Martinez',
        dni: '0801-1999-10071',
        salary: '17,750.00',
        role: 'Procesador de Datos',
        department: 'PROCESSING',
        hireDate: '4/1/2024',
        status: 'Activo',
        email: 'danu.martinez07@gmail.com'
      },
      {
        name: 'Evelin Daniela Oseguera Aguilar',
        dni: '0801-2001-04394',
        salary: '17,500.00',
        role: 'Actualizacion de Datos',
        department: 'DATA ENTRY',
        hireDate: '4/1/2024',
        status: 'Activo',
        email: 'evelynoseguera2201@gmail.com'
      },
      {
        name: 'Astrid Mariela Colindres Zelaya',
        dni: '0801-1999-10070',
        salary: '17,750.00',
        role: 'Procesador de Datos',
        department: 'PROCESSING',
        hireDate: '4/1/2024',
        status: 'Activo',
        email: 'maryzelaya1999@gmail.com'
      },
      {
        name: 'Helen Daniela Matute Zambrano',
        dni: '0801-2000-20638',
        salary: '17,500.00',
        role: 'Vericacion de Datos-Español',
        department: 'COMPLIANCE',
        hireDate: '4/1/2024',
        status: 'Activo',
        email: 'matutedaniela2403@gmail.com'
      },
      {
        name: 'Emely Rachel Romero Cabrera',
        dni: '0801-1999-15616',
        salary: '17,500.00',
        role: 'Vericacion de Datos-Español',
        department: 'COMPLIANCE',
        hireDate: '4/1/2024',
        status: 'Activo',
        email: 'emelyromerocabrera24@gmail.com'
      },
      {
        name: 'Yorleny Paveth Oliva Maldonado',
        dni: '0801-1988-21145',
        salary: '17,500.00',
        role: 'Vericacion de Datos-Español',
        department: 'COMPLIANCE',
        hireDate: '4/1/2024',
        status: 'Activo',
        email: null
      },
      {
        name: 'Isis Amaleth Ardon Maradiaga',
        dni: '0801-2012-22694',
        salary: '17,500.00',
        role: 'Vericacion de Datos-Español',
        department: 'COMPLIANCE',
        hireDate: '4/1/2024',
        status: 'Activo',
        email: 'ardonmaradiagaisisamaleth@gmail.com'
      },
      {
        name: 'David Gonzales Maldonado',
        dni: '0510-1997-00186',
        salary: '18,200.00',
        role: 'Data Entry',
        department: 'DATA ENTRY',
        hireDate: '4/1/2024',
        status: 'Activo',
        email: 'dgmaldonado.dev@gmail.com'
      },
      {
        name: 'Luis Francisco Murillo Carcamo',
        dni: '0801-1988-14537',
        salary: '17,500.00',
        role: 'Negociación',
        department: 'NEGOTIATION',
        hireDate: '2/15/2024',
        status: 'Activo',
        email: 'murilofrancisco88@outlook.com'
      },
      {
        name: 'Jesús Alcides Sagastume Martínez',
        dni: '0801-1997-04866',
        salary: '17,500.00',
        role: 'Contact Center Agent',
        department: 'Customer Service',
        hireDate: '4/2/2024',
        status: 'Activo',
        email: 'jsagastume@paragonfinancialcorp.com'
      },
      {
        name: 'Jonny Omar Salinas Rosales',
        dni: '1505-1990-00439',
        salary: '15,500.00',
        role: 'Contact Center Agent',
        department: 'Customer Service',
        hireDate: '11/4/2024',
        status: 'Activo',
        email: 'kingkatracho1990@gmail.com'
      },
      {
        name: 'Francisco Javier Mendez Montenegro',
        dni: '0615-1986-00142',
        salary: '21,000.00',
        role: 'Customer Service Manager',
        department: 'Customer Service',
        hireDate: '4/1/2024',
        status: 'Activo',
        email: 'frankberries07@gmail.com'
      },
      {
        name: 'Angel David Alvarenga Martinez',
        dni: '0801-2001-22056',
        salary: '17,300.00',
        role: 'Actualizacion de Datos',
        department: 'DATA ENTRY',
        hireDate: '4/1/2024',
        status: 'Activo',
        email: 'alvarengangel15@gmail.com'
      },
      {
        name: 'Lourdes Raquel Aguirre',
        dni: '0801-1990-21037',
        salary: '17,300.00',
        role: 'Actualizacion de Datos',
        department: 'DATA ENTRY',
        hireDate: '4/1/2024',
        status: 'Activo',
        email: 'raguirre489@gmail.com'
      },
      {
        name: 'Gustavo Noel Argueta Zelaya',
        dni: '0801-1985-22949',
        salary: '42,418.92',
        role: 'Gerente de Operaciones',
        department: 'MANAGER',
        hireDate: '4/1/2024',
        status: 'Activo',
        email: 'gustavo.gnaz@gmail.com'
      },
      {
        name: 'Kenia Isabel Zambrano Molina',
        dni: '0801-1998-03487',
        salary: '19,100.00',
        role: 'Verificacion de Datos-Ingles',
        department: 'Customer Service',
        hireDate: '6/11/2024',
        status: 'Activo',
        email: 'zkenia993@gmail.com'
      },
      {
        name: 'Wolfang Andre Sosa Lanza',
        dni: '0801-1999-20200',
        salary: '18,700.00',
        role: 'Verificacion de Datos-Ingles',
        department: 'Customer Service',
        hireDate: '6/18/2024',
        status: 'Activo',
        email: 'wolfangsosa5@gmail.com'
      },
      {
        name: 'Jorge Arturo Gómez Coello',
        dni: '0510-1991-00731',
        salary: '35,000.00',
        role: 'Jefe de Personal',
        department: 'HR',
        hireDate: '7/1/2024',
        status: 'Activo',
        email: 'jorge7gomez@gmail.com'
      },
      {
        name: 'Jorge Luis Rodriguez Macedo',
        dni: '0806-1998-00200',
        salary: '17,750.00',
        role: 'Verificacion de Datos-Ingles',
        department: 'COMPLIANCE',
        hireDate: '7/16/2024',
        status: 'Activo',
        email: '12rodruguez@gmail.com'
      },
      {
        name: 'Claudette Desiree Rollings Martinez',
        dni: '0101-1983-02150',
        salary: '17,500.00',
        role: 'Negociación',
        department: 'NEGOTIATION',
        hireDate: '7/29/2024',
        status: 'Activo',
        email: 'claudetterollins@hotmail.com'
      },
      {
        name: 'Roberto Carlos Meraz Canales',
        dni: '0801-2002-10616',
        salary: '17,250.00',
        role: 'Contact Center Agent',
        department: 'COMPLIANCE',
        hireDate: '10/11/2024',
        status: 'Activo',
        email: 'charliemeraz.rcmc@gmail.com'
      },
      {
        name: 'Marcelo Alejandro Folgar Bonilla',
        dni: '0801-1996-15245',
        salary: '15,500.00',
        role: 'Contact Center Agent',
        department: 'Customer Service',
        hireDate: '12/16/2024',
        status: 'Activo',
        email: 'alejandrosbonillas@gmail.com'
      },
      {
        name: 'André Alexander García Laínez',
        dni: '0801-1997-23863',
        salary: '15,500.00',
        role: 'Contact Center Agent',
        department: 'Customer Service',
        hireDate: '1/2/2025',
        status: 'Activo',
        email: 'andregarcia27_@outlook.com'
      },
      {
        name: 'David Alejandro Santos Ordoñez',
        dni: '0801-2005-09404',
        salary: '15,500.00',
        role: 'Contact Center Agent',
        department: 'Customer Service',
        hireDate: '1/6/2025',
        status: 'Activo',
        email: 'dsantosordonez007@gmail.com'
      },
      {
        name: 'Amsi Abigail Urquía Durón',
        dni: '0801 2006 13174',
        salary: '15,500.00',
        role: 'Contact Center Agent',
        department: 'DATA ENTRY',
        hireDate: '1/9/2025',
        status: 'Activo',
        email: 'urquiaabi@gmail.com'
      },
      {
        name: 'Fabiola Yadira Castillo Moncada',
        dni: '0801-1996-12309',
        salary: '15,500.00',
        role: 'Contact Center Agent',
        department: 'COMPLIANCE',
        hireDate: '1/27/2025',
        status: 'Activo',
        email: 'fabiolacastillo1995@yahoo.com'
      },
      {
        name: 'Vladimir Rodriguez Castejón',
        dni: '0801-1991-05878',
        salary: '15,500.00',
        role: 'Contact Center Agent',
        department: 'NEGOTIATION',
        hireDate: '2/3/2025',
        status: 'Activo',
        email: 'vladicastejon21@gmail.com'
      },
      {
        name: 'Alejandro José Salgado Girón',
        dni: '0801-2004-10716',
        salary: '14,500.00',
        role: 'Contact Center Agent',
        department: 'Customer Service',
        hireDate: '5/28/2025',
        status: 'Activo',
        email: null
      },
      {
        name: 'Daniel Vladimir Hernadez Salgado',
        dni: '0801-2000-15164',
        salary: '14,500.00',
        role: 'Contact Center Agent',
        department: 'INSURANCE',
        hireDate: '7/1/2025',
        status: 'Activo',
        email: null
      },
      {
        name: 'Enrique Alejandro Casco Murillo',
        dni: '0801-1987-02088',
        salary: '14,500.00',
        role: 'Contact Center Agent',
        department: 'INSURANCE',
        hireDate: '7/1/2025',
        status: 'Activo',
        email: null
      },
      {
        name: 'Gerardo Leonel Fernandez Martinez',
        dni: '0801-1982-09157',
        salary: '14,500.00',
        role: 'Contact Center Agent',
        department: 'INSURANCE',
        hireDate: '7/1/2025',
        status: 'Activo',
        email: null
      },
      {
        name: 'Seth Isaí Godoy Cantarero',
        dni: '0801-2003-14588',
        salary: '14,500.00',
        role: 'Contact Center Agent',
        department: 'INSURANCE',
        hireDate: '7/1/2025',
        status: 'Activo',
        email: null
      },
      {
        name: 'Raúl Eduardo Espinoza Núñez',
        dni: '0801-2003-17862',
        salary: '14,500.00',
        role: 'Contact Center Agent',
        department: 'INSURANCE',
        hireDate: '7/21/2025',
        status: 'Activo',
        email: null
      },
      {
        name: 'Gerson Enoc Zuniga Chang',
        dni: '0801-200107986',
        salary: '14,500.00',
        role: 'Contact Center Agent',
        department: 'INSURANCE',
        hireDate: '7/30/2025',
        status: 'Activo',
        email: null
      }
    ];

    const processedEmployees = rawData.map((emp, index) => {
      // Separar nombre completo en first_name y last_name
      const nameParts = emp.name.split(' ');
      const firstName = nameParts.slice(0, -1).join(' ');
      const lastName = nameParts[nameParts.length - 1];

      const processed = {
        id: this.generateUUID(),
        company_id: null, // Se asignará después
        department_id: null, // Se asignará después
        dni: this.sanitizeDNI(emp.dni),
        first_name: this.sanitizeName(firstName),
        last_name: this.sanitizeName(lastName),
        email: this.sanitizeEmail(emp.email),
        phone: null, // No disponible en los datos
        position: emp.role,
        base_salary: this.sanitizeSalary(emp.salary),
        hire_date: this.convertDate(emp.hireDate),
        status: emp.status === 'Activo' ? 'active' : 'inactive',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Validaciones
      if (!processed.dni) {
        log(`⚠️  Empleado ${index + 1}: DNI inválido - ${emp.dni}`, 'yellow');
        this.stats.warnings++;
      }

      if (!processed.first_name || !processed.last_name) {
        log(`⚠️  Empleado ${index + 1}: Nombre incompleto`, 'yellow');
        this.stats.warnings++;
      }

      if (!processed.email) {
        log(`⚠️  Empleado ${index + 1}: Email faltante`, 'yellow');
        this.stats.warnings++;
      }

      this.stats.processed++;
      return processed;
    });

    log(`✅ Empleados procesados: ${processedEmployees.length}`, 'green');
    return processedEmployees;
  }

  // Crear departamentos basados en los datos reales
  createDepartmentsFromData(employees) {
    log('\n🏢 CREANDO DEPARTAMENTOS BASADOS EN DATOS REALES', 'yellow');
    
    const departmentSet = new Set();
    employees.forEach(emp => {
      const dept = emp.position.includes('Customer Service') ? 'Customer Service' : 
                   emp.position.includes('Data') ? 'DATA ENTRY' :
                   emp.position.includes('Procesador') ? 'PROCESSING' :
                   emp.position.includes('Verificacion') ? 'COMPLIANCE' :
                   emp.position.includes('Negociación') ? 'NEGOTIATION' :
                   emp.position.includes('Manager') ? 'MANAGER' :
                   emp.position.includes('HR') ? 'HR' :
                   emp.position.includes('Insurance') ? 'INSURANCE' : 'General';
      departmentSet.add(dept);
    });

    const departments = Array.from(departmentSet).map(dept => ({
      id: this.generateUUID(),
      company_id: null, // Se asignará después
      name: this.mapDepartment(dept),
      description: `Departamento de ${this.mapDepartment(dept)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    log(`✅ Departamentos creados: ${departments.length}`, 'green');
    departments.forEach(dept => log(`   - ${dept.name}`, 'blue'));
    
    return departments;
  }

  // Actualizar archivos de importación
  async updateImportFiles(employees, departments) {
    log('\n📁 ACTUALIZANDO ARCHIVOS DE IMPORTACIÓN', 'yellow');
    
    // Leer empresa existente
    const companiesPath = path.join(this.outputDir, 'companies.json');
    const companies = JSON.parse(fs.readFileSync(companiesPath, 'utf8'));
    const companyId = companies[0].id;

    // Asignar company_id a departamentos
    departments.forEach(dept => dept.company_id = companyId);

    // Crear mapeo de departamentos
    const departmentMap = {};
    departments.forEach(dept => {
      const originalName = dept.name;
      if (originalName.includes('Customer Service')) departmentMap['Customer Service'] = dept.id;
      else if (originalName.includes('Entrada de Datos')) departmentMap['DATA ENTRY'] = dept.id;
      else if (originalName.includes('Procesamiento')) departmentMap['PROCESSING'] = dept.id;
      else if (originalName.includes('Cumplimiento')) departmentMap['COMPLIANCE'] = dept.id;
      else if (originalName.includes('Negociación')) departmentMap['NEGOTIATION'] = dept.id;
      else if (originalName.includes('Gerencia')) departmentMap['MANAGER'] = dept.id;
      else if (originalName.includes('Recursos Humanos')) departmentMap['HR'] = dept.id;
      else if (originalName.includes('Seguros')) departmentMap['INSURANCE'] = dept.id;
    });

    // Asignar company_id y department_id a empleados
    employees.forEach(emp => {
      emp.company_id = companyId;
      
      // Determinar departamento basado en el rol
      let deptKey = 'General';
      if (emp.position.includes('Customer Service')) deptKey = 'Customer Service';
      else if (emp.position.includes('Data') || emp.position.includes('Actualizacion')) deptKey = 'DATA ENTRY';
      else if (emp.position.includes('Procesador')) deptKey = 'PROCESSING';
      else if (emp.position.includes('Verificacion')) deptKey = 'COMPLIANCE';
      else if (emp.position.includes('Negociación')) deptKey = 'NEGOTIATION';
      else if (emp.position.includes('Manager') || emp.position.includes('Gerente')) deptKey = 'MANAGER';
      else if (emp.position.includes('Personal')) deptKey = 'HR';
      else if (emp.position.includes('Insurance')) deptKey = 'INSURANCE';
      
      emp.department_id = departmentMap[deptKey] || departments[0].id;
    });

    // Guardar archivos actualizados
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

    // Crear script de importación actualizado
    const importScript = this.createUpdatedImportScript();
    const scriptPath = path.join(this.outputDir, 'import-real-data.js');
    fs.writeFileSync(scriptPath, importScript);
    fs.chmodSync(scriptPath, '755');
    
    log(`✅ Script de importación actualizado: ${scriptPath}`, 'green');
  }

  // Crear script de importación actualizado
  createUpdatedImportScript() {
    return `#!/usr/bin/env node

/**
 * Script de importación para datos reales de empleados
 * Generado por process-real-employee-data.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config();

console.log('🚀 IMPORTANDO DATOS REALES DE EMPLEADOS');
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

async function importRealData() {
  try {
    console.log('📦 Importando empresas...');
    const companiesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'companies.json'), 'utf8'));
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .upsert(companiesData, { onConflict: 'id' });
    
    if (companiesError) throw companiesError;
    console.log(\`✅ Companies importadas: \${companies.length}\`);
    
    console.log('📦 Importando departamentos...');
    const departmentsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'departments.json'), 'utf8'));
    const { data: departments, error: departmentsError } = await supabase
      .from('departments')
      .upsert(departmentsData, { onConflict: 'id' });
    
    if (departmentsError) throw departmentsError;
    console.log(\`✅ Departments importados: \${departments.length}\`);
    
    console.log('📦 Importando empleados reales...');
    const employeesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'employees.json'), 'utf8'));
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .upsert(employeesData, { onConflict: 'id' });
    
    if (employeesError) throw employeesError;
    console.log(\`✅ Employees importados: \${employees.length}\`);
    
    console.log('\\n🎉 IMPORTACIÓN DE DATOS REALES COMPLETADA');
    console.log('='.repeat(50));
    console.log('📊 Resumen:');
    console.log(\`   - Empresas: \${companies.length}\`);
    console.log(\`   - Departamentos: \${departments.length}\`);
    console.log(\`   - Empleados: \${employees.length}\`);
    console.log('\\n✅ Los datos reales están listos para usar en la aplicación');
    
  } catch (error) {
    console.error('❌ Error en importación:', error.message);
    console.error('\\n💡 Solución:');
    console.error('1. Verifica que las migraciones estén aplicadas: supabase db push');
    console.error('2. Verifica las variables de entorno');
    console.error('3. Verifica la conexión a Supabase');
    process.exit(1);
  }
}

importRealData();
`;
  }

  // Generar reporte
  generateReport() {
    log('\n📊 REPORTE DE PROCESAMIENTO', 'cyan');
    log('='.repeat(40), 'cyan');
    log(`📈 Empleados procesados: ${this.stats.processed}`, 'green');
    log(`⚠️  Advertencias: ${this.stats.warnings}`, 'yellow');
    log(`❌ Errores: ${this.stats.errors}`, 'red');
    
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      description: 'Datos reales de empleados procesados para importación',
      files: ['companies.json', 'departments.json', 'employees.json', 'import-real-data.js']
    };

    const reportPath = path.join(this.outputDir, 'real-data-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    log(`📄 Reporte guardado: ${reportPath}`, 'green');
  }

  async run() {
    await this.init();
    
    // Procesar datos de empleados
    const employees = this.processEmployeeData();
    
    // Crear departamentos basados en los datos
    const departments = this.createDepartmentsFromData(employees);
    
    // Actualizar archivos de importación
    await this.updateImportFiles(employees, departments);
    
    // Generar reporte
    this.generateReport();
    
    log('\n🎉 PROCESAMIENTO DE DATOS REALES COMPLETADO', 'green');
    log('='.repeat(60), 'green');
    log('Archivos actualizados en:', 'cyan');
    log(`📁 ${this.outputDir}`, 'yellow');
    log('\nPara importar los datos reales:', 'cyan');
    log('1. cd import-data', 'yellow');
    log('2. node import-real-data.js', 'yellow');
    log('\n✅ Los datos reales están listos para importar', 'green');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const processor = new RealEmployeeDataProcessor();
  processor.run().catch(error => {
    log(`❌ Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = RealEmployeeDataProcessor; 