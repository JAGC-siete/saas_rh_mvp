#!/usr/bin/env node

/**
 * Script completo para setup de datos
 * 1. Corrige problemas de migración
 * 2. Sanea datos existentes
 * 3. Prepara datos para importación
 * 4. Genera scripts de importación
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

class CompleteDataSetup {
  constructor() {
    this.stats = {
      migrationsFixed: 0,
      dataProcessed: 0,
      filesGenerated: 0
    };
  }

  async init() {
    log('🚀 INICIANDO SETUP COMPLETO DE DATOS', 'cyan');
    log('='.repeat(60), 'cyan');
    log('Este script realizará:', 'blue');
    log('1. ✅ Corrección de problemas de migración', 'green');
    log('2. 🧹 Saneamiento de datos existentes', 'green');
    log('3. 📦 Preparación de datos para importación', 'green');
    log('4. 📝 Generación de scripts de importación', 'green');
    log('='.repeat(60), 'cyan');
  }

  // Paso 1: Corregir problemas de migración
  async fixMigrationIssues() {
    log('\n🔧 PASO 1: CORRIGIENDO PROBLEMAS DE MIGRACIÓN', 'yellow');
    
    try {
      // Ejecutar el script de corrección de migración
      execSync('node scripts/fix-migration-issue.js', { stdio: 'inherit' });
      this.stats.migrationsFixed++;
      log('✅ Problemas de migración corregidos', 'green');
      return true;
    } catch (error) {
      log(`❌ Error corrigiendo migraciones: ${error.message}`, 'red');
      return false;
    }
  }

  // Paso 2: Sanear datos
  async sanitizeData() {
    log('\n🧹 PASO 2: SANEANDO DATOS', 'yellow');
    
    try {
      // Ejecutar el script de saneamiento mejorado
      execSync('node scripts/improved-data-sanitizer.js', { stdio: 'inherit' });
      this.stats.dataProcessed++;
      log('✅ Datos saneados correctamente', 'green');
      return true;
    } catch (error) {
      log(`❌ Error saneando datos: ${error.message}`, 'red');
      return false;
    }
  }

  // Paso 3: Verificar archivos generados
  async verifyGeneratedFiles() {
    log('\n📁 PASO 3: VERIFICANDO ARCHIVOS GENERADOS', 'yellow');
    
    const importDir = path.join(__dirname, '..', 'import-data');
    const requiredFiles = ['companies.json', 'departments.json', 'employees.json', 'import.js'];
    
    for (const file of requiredFiles) {
      const filePath = path.join(importDir, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        log(`✅ ${file}: ${(stats.size / 1024).toFixed(2)} KB`, 'green');
        this.stats.filesGenerated++;
      } else {
        log(`❌ ${file}: No encontrado`, 'red');
      }
    }
  }

  // Paso 4: Crear script de importación final
  async createFinalImportScript() {
    log('\n📝 PASO 4: CREANDO SCRIPT DE IMPORTACIÓN FINAL', 'yellow');
    
    const finalScript = `#!/usr/bin/env node

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
    console.log(\`✅ Companies importadas: \${companies.length}\`);
    
    console.log('📦 Importando departamentos...');
    const departmentsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'departments.json'), 'utf8'));
    const { data: departments, error: departmentsError } = await supabase
      .from('departments')
      .upsert(departmentsData, { onConflict: 'id' });
    
    if (departmentsError) throw departmentsError;
    console.log(\`✅ Departments importados: \${departments.length}\`);
    
    console.log('📦 Importando empleados...');
    const employeesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'employees.json'), 'utf8'));
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .upsert(employeesData, { onConflict: 'id' });
    
    if (employeesError) throw employeesError;
    console.log(\`✅ Employees importados: \${employees.length}\`);
    
    console.log('\\n🎉 IMPORTACIÓN COMPLETADA EXITOSAMENTE');
    console.log('='.repeat(50));
    console.log('📊 Resumen:');
    console.log(\`   - Empresas: \${companies.length}\`);
    console.log(\`   - Departamentos: \${departments.length}\`);
    console.log(\`   - Empleados: \${employees.length}\`);
    console.log('\\n✅ Los datos están listos para usar en la aplicación');
    
  } catch (error) {
    console.error('❌ Error en importación:', error.message);
    console.error('\n💡 Solución:');
    console.error('1. Verifica que las migraciones estén aplicadas: supabase db push');
    console.error('2. Verifica las variables de entorno');
    console.error('3. Verifica la conexión a Supabase');
    process.exit(1);
  }
}

importData();
`;

    const scriptPath = path.join(__dirname, '..', 'import-data', 'final-import.js');
    fs.writeFileSync(scriptPath, finalScript);
    fs.chmodSync(scriptPath, '755');
    
    log(`✅ Script final creado: ${scriptPath}`, 'green');
    return scriptPath;
  }

  // Paso 5: Crear documentación
  async createDocumentation() {
    log('\n📚 PASO 5: CREANDO DOCUMENTACIÓN', 'yellow');
    
    const readme = `# Importación de Datos - Setup Completo

## Archivos Generados

- \`companies.json\`: Datos de empresas
- \`departments.json\`: Datos de departamentos  
- \`employees.json\`: Datos de empleados
- \`import.js\`: Script de importación básico
- \`final-import.js\`: Script de importación final (recomendado)

## Pasos para Importar

### 1. Corregir Migraciones (si es necesario)
\`\`\`bash
# Si hay problemas con supabase db pull
node scripts/fix-migration-issue.js
supabase db reset
supabase db push
\`\`\`

### 2. Importar Datos
\`\`\`bash
cd import-data
node final-import.js
\`\`\`

### 3. Verificar Importación
\`\`\`bash
# Verificar en Supabase Dashboard
# O usar el script de verificación
node scripts/verify-data-import.js
\`\`\`

## Variables de Entorno Requeridas

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
\`\`\`

## Estructura de Datos

### Companies
- 1 empresa principal con configuración completa

### Departments  
- Recursos Humanos
- Tecnología
- Administración
- Ventas
- Marketing

### Employees
- 10 empleados de ejemplo con datos realistas
- DNIs únicos
- Emails corporativos
- Salarios apropiados
- Fechas de contratación variadas

## Notas Importantes

- Los datos son de ejemplo y pueden ser modificados
- Todos los UUIDs son generados automáticamente
- Los datos están relacionados correctamente (company_id, department_id)
- El script maneja duplicados automáticamente

## Troubleshooting

### Error: Variables de entorno no encontradas
Verifica que el archivo .env contenga las variables requeridas

### Error: Problemas de migración
Ejecuta: \`node scripts/fix-migration-issue.js\`

### Error: Conexión a Supabase
Verifica las credenciales y la conectividad de red
`;

    const readmePath = path.join(__dirname, '..', 'import-data', 'README.md');
    fs.writeFileSync(readmePath, readme);
    
    log(`✅ Documentación creada: ${readmePath}`, 'green');
  }

  // Generar reporte final
  generateFinalReport() {
    log('\n📊 REPORTE FINAL', 'cyan');
    log('='.repeat(40), 'cyan');
    log(`🔧 Migraciones corregidas: ${this.stats.migrationsFixed}`, 'green');
    log(`🧹 Datos procesados: ${this.stats.dataProcessed}`, 'green');
    log(`📁 Archivos generados: ${this.stats.filesGenerated}`, 'green');
    
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      status: 'completed',
      nextSteps: [
        '1. Ejecutar: supabase db reset (si hay problemas)',
        '2. Ejecutar: supabase db push',
        '3. Ejecutar: cd import-data && node final-import.js',
        '4. Verificar datos en Supabase Dashboard'
      ]
    };

    const reportPath = path.join(__dirname, '..', 'import-data', 'final-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    log(`📄 Reporte final guardado: ${reportPath}`, 'green');
  }

  async run() {
    await this.init();
    
    // Ejecutar todos los pasos
    const migrationFixed = await this.fixMigrationIssues();
    const dataSanitized = await this.sanitizeData();
    
    if (migrationFixed && dataSanitized) {
      await this.verifyGeneratedFiles();
      await this.createFinalImportScript();
      await this.createDocumentation();
      this.generateFinalReport();
      
      log('\n🎉 SETUP COMPLETO FINALIZADO', 'green');
      log('='.repeat(60), 'green');
      log('Próximos pasos:', 'cyan');
      log('1. supabase db reset (si hay problemas)', 'yellow');
      log('2. supabase db push', 'yellow');
      log('3. cd import-data', 'yellow');
      log('4. node final-import.js', 'yellow');
      log('\n✅ Los datos están listos para importar', 'green');
    } else {
      log('\n❌ SETUP INCOMPLETO', 'red');
      log('Revisa los errores anteriores y vuelve a intentar', 'red');
      process.exit(1);
    }
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const setup = new CompleteDataSetup();
  setup.run().catch(error => {
    log(`❌ Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = CompleteDataSetup; 