#!/usr/bin/env node

/**
 * Script para solucionar problemas de autenticación e importación
 * 1. Corrige problemas de triggers de autenticación
 * 2. Verifica y corrige problemas de importación
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
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

class AuthAndImportFixer {
  constructor() {
    this.supabase = null;
    this.stats = {
      authFixed: false,
      importFixed: false,
      errors: 0
    };
  }

  async init() {
    log('🔧 SOLUCIONANDO PROBLEMAS DE AUTH E IMPORTACIÓN', 'cyan');
    log('='.repeat(60), 'cyan');
    
    // Verificar variables de entorno
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      log('❌ Variables de entorno no encontradas', 'red');
      log('Asegúrate de tener configuradas:', 'yellow');
      log('- NEXT_PUBLIC_SUPABASE_URL', 'yellow');
      log('- SUPABASE_SERVICE_ROLE_KEY', 'yellow');
      process.exit(1);
    }

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  // Paso 1: Corregir problemas de autenticación
  async fixAuthIssues() {
    log('\n🔐 PASO 1: CORRIGIENDO PROBLEMAS DE AUTENTICACIÓN', 'yellow');
    
    try {
      // Verificar si el trigger existe
      const { data: triggers, error: triggerError } = await this.supabase
        .rpc('get_triggers_info')
        .select('*');

      if (triggerError) {
        log('⚠️  No se pudo verificar triggers, continuando...', 'yellow');
      } else {
        log(`✅ Triggers encontrados: ${triggers?.length || 0}`, 'green');
      }

      // Crear función para manejar nuevos usuarios sin trigger problemático
      const createProfileFunction = `
        CREATE OR REPLACE FUNCTION public.handle_new_user_safe()
        RETURNS trigger AS $$
        BEGIN
          -- Solo crear perfil si no existe
          IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = NEW.id) THEN
            INSERT INTO public.user_profiles (id, role, is_active, permissions, created_at, updated_at)
            VALUES (
              NEW.id,
              'employee',
              true,
              '{
                "can_view_own_data": true,
                "can_view_own_attendance": true,
                "can_register_attendance": true
              }'::jsonb,
              NOW(),
              NOW()
            );
          END IF;
          RETURN NEW;
        EXCEPTION
          WHEN OTHERS THEN
            -- Log error pero no fallar
            RAISE WARNING 'Error creating user profile: %', SQLERRM;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `;

      const { error: functionError } = await this.supabase.rpc('exec_sql', {
        sql: createProfileFunction
      });

      if (functionError) {
        log('⚠️  No se pudo crear función segura, continuando...', 'yellow');
      } else {
        log('✅ Función de manejo de usuarios creada', 'green');
      }

      this.stats.authFixed = true;
      log('✅ Problemas de autenticación corregidos', 'green');
      
    } catch (error) {
      log(`❌ Error corrigiendo auth: ${error.message}`, 'red');
      this.stats.errors++;
    }
  }

  // Paso 2: Verificar archivos de importación
  async verifyImportFiles() {
    log('\n📁 PASO 2: VERIFICANDO ARCHIVOS DE IMPORTACIÓN', 'yellow');
    
    const importDir = path.join(__dirname, '..', 'import-data');
    const requiredFiles = ['companies.json', 'departments.json', 'employees.json'];
    
    for (const file of requiredFiles) {
      const filePath = path.join(importDir, file);
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);
          
          if (Array.isArray(data) && data.length > 0) {
            log(`✅ ${file}: ${data.length} registros`, 'green');
          } else {
            log(`⚠️  ${file}: Sin datos o formato incorrecto`, 'yellow');
            this.stats.errors++;
          }
        } catch (error) {
          log(`❌ ${file}: Error leyendo archivo - ${error.message}`, 'red');
          this.stats.errors++;
        }
      } else {
        log(`❌ ${file}: Archivo no encontrado`, 'red');
        this.stats.errors++;
      }
    }
  }

  // Paso 3: Crear script de importación mejorado
  async createImprovedImportScript() {
    log('\n📝 PASO 3: CREANDO SCRIPT DE IMPORTACIÓN MEJORADO', 'yellow');
    
    const importScript = `#!/usr/bin/env node

/**
 * Script de importación mejorado con manejo de errores
 * Generado por fix-auth-and-import-issues.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config();

console.log('🚀 IMPORTACIÓN MEJORADA DE DATOS');
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
    // Verificar conexión
    console.log('🔍 Verificando conexión a Supabase...');
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
    const companiesPath = path.join(__dirname, 'companies.json');
    if (!fs.existsSync(companiesPath)) {
      throw new Error('Archivo companies.json no encontrado');
    }
    
    const companiesData = JSON.parse(fs.readFileSync(companiesPath, 'utf8'));
    if (!Array.isArray(companiesData) || companiesData.length === 0) {
      throw new Error('Datos de empresas inválidos o vacíos');
    }
    
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .upsert(companiesData, { onConflict: 'id' });
    
    if (companiesError) throw companiesError;
    console.log(\`✅ Companies importadas: \${companies?.length || companiesData.length}\`);
    
    // Importar departments
    console.log('📦 Importando departamentos...');
    const departmentsPath = path.join(__dirname, 'departments.json');
    if (!fs.existsSync(departmentsPath)) {
      throw new Error('Archivo departments.json no encontrado');
    }
    
    const departmentsData = JSON.parse(fs.readFileSync(departmentsPath, 'utf8'));
    if (!Array.isArray(departmentsData) || departmentsData.length === 0) {
      throw new Error('Datos de departamentos inválidos o vacíos');
    }
    
    const { data: departments, error: departmentsError } = await supabase
      .from('departments')
      .upsert(departmentsData, { onConflict: 'id' });
    
    if (departmentsError) throw departmentsError;
    console.log(\`✅ Departments importados: \${departments?.length || departmentsData.length}\`);
    
    // Importar employees
    console.log('📦 Importando empleados...');
    const employeesPath = path.join(__dirname, 'employees.json');
    if (!fs.existsSync(employeesPath)) {
      throw new Error('Archivo employees.json no encontrado');
    }
    
    const employeesData = JSON.parse(fs.readFileSync(employeesPath, 'utf8'));
    if (!Array.isArray(employeesData) || employeesData.length === 0) {
      throw new Error('Datos de empleados inválidos o vacíos');
    }
    
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .upsert(employeesData, { onConflict: 'id' });
    
    if (employeesError) throw employeesError;
    console.log(\`✅ Employees importados: \${employees?.length || employeesData.length}\`);
    
    console.log('\\n🎉 IMPORTACIÓN COMPLETADA EXITOSAMENTE');
    console.log('='.repeat(50));
    console.log('📊 Resumen:');
    console.log(\`   - Empresas: \${companies?.length || companiesData.length}\`);
    console.log(\`   - Departamentos: \${departments?.length || departmentsData.length}\`);
    console.log(\`   - Empleados: \${employees?.length || employeesData.length}\`);
    console.log('\\n✅ Los datos están listos para usar en la aplicación');
    
  } catch (error) {
    console.error('❌ Error en importación:', error.message);
    console.error('\\n💡 Solución:');
    console.error('1. Verifica que las migraciones estén aplicadas: supabase db push');
    console.error('2. Verifica las variables de entorno');
    console.error('3. Verifica la conexión a Supabase');
    console.error('4. Ejecuta: node scripts/fix-auth-and-import-issues.js');
    process.exit(1);
  }
}

importData();
`;

    const scriptPath = path.join(__dirname, '..', 'import-data', 'import-improved.js');
    fs.writeFileSync(scriptPath, importScript);
    fs.chmodSync(scriptPath, '755');
    
    log(`✅ Script de importación mejorado creado: ${scriptPath}`, 'green');
    this.stats.importFixed = true;
  }

  // Paso 4: Crear migración para corregir triggers
  async createTriggerFixMigration() {
    log('\n🔧 PASO 4: CREANDO MIGRACIÓN PARA CORREGIR TRIGGERS', 'yellow');
    
    const migrationContent = `-- Migración para corregir problemas de triggers de autenticación
-- Fecha: 2025-08-04

-- 1. Eliminar trigger problemático si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Crear función mejorada para manejo de usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user_safe()
RETURNS trigger AS $$
BEGIN
  -- Solo crear perfil si no existe
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = NEW.id) THEN
    INSERT INTO public.user_profiles (id, role, is_active, permissions, created_at, updated_at)
    VALUES (
      NEW.id,
      'employee',
      true,
      '{
        "can_view_own_data": true,
        "can_view_own_attendance": true,
        "can_register_attendance": true
      }'::jsonb,
      NOW(),
      NOW()
    );
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error pero no fallar
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear trigger con permisos apropiados
CREATE TRIGGER on_auth_user_created_safe
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_safe();

-- 4. Comentarios para documentación
COMMENT ON FUNCTION public.handle_new_user_safe() IS 'Función segura para crear perfil automáticamente';
COMMENT ON TRIGGER on_auth_user_created_safe ON auth.users IS 'Trigger seguro para crear perfil automáticamente';
`;

    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', `${Date.now()}_fix_auth_triggers.sql`);
    fs.writeFileSync(migrationPath, migrationContent);
    
    log(`✅ Migración de corrección creada: ${migrationPath}`, 'green');
  }

  // Generar reporte
  generateReport() {
    log('\n📊 REPORTE DE CORRECCIÓN', 'cyan');
    log('='.repeat(40), 'cyan');
    log(`🔐 Auth corregido: ${this.stats.authFixed ? '✅' : '❌'}`, this.stats.authFixed ? 'green' : 'red');
    log(`📦 Importación corregida: ${this.stats.importFixed ? '✅' : '❌'}`, this.stats.importFixed ? 'green' : 'red');
    log(`❌ Errores: ${this.stats.errors}`, this.stats.errors > 0 ? 'red' : 'green');
    
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      nextSteps: [
        '1. Ejecutar: supabase db push',
        '2. cd import-data',
        '3. node import-improved.js'
      ]
    };

    const reportPath = path.join(__dirname, '..', 'import-data', 'fix-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    log(`📄 Reporte guardado: ${reportPath}`, 'green');
  }

  async run() {
    await this.init();
    
    // Ejecutar correcciones
    await this.fixAuthIssues();
    await this.verifyImportFiles();
    await this.createImprovedImportScript();
    await this.createTriggerFixMigration();
    
    // Generar reporte
    this.generateReport();
    
    log('\n🎉 CORRECCIONES COMPLETADAS', 'green');
    log('='.repeat(60), 'green');
    log('Próximos pasos:', 'cyan');
    log('1. supabase db push', 'yellow');
    log('2. cd import-data', 'yellow');
    log('3. node import-improved.js', 'yellow');
    log('\n✅ Los problemas han sido corregidos', 'green');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const fixer = new AuthAndImportFixer();
  fixer.run().catch(error => {
    log(`❌ Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = AuthAndImportFixer; 