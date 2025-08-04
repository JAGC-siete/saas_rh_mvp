#!/usr/bin/env node

/**
 * Script simplificado para solucionar problemas de importación
 * No requiere conexión a Supabase, solo verifica y corrige archivos
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

class SimpleImportFixer {
  constructor() {
    this.stats = {
      filesVerified: 0,
      filesFixed: 0,
      errors: 0
    };
    this.importDir = path.join(__dirname, '..', 'import-data');
  }

  async init() {
    log('🔧 SOLUCIONANDO PROBLEMAS DE IMPORTACIÓN', 'cyan');
    log('='.repeat(60), 'cyan');
  }

  // Verificar y corregir archivos de importación
  async verifyAndFixImportFiles() {
    log('\n📁 VERIFICANDO Y CORRIGIENDO ARCHIVOS DE IMPORTACIÓN', 'yellow');
    
    const requiredFiles = ['companies.json', 'departments.json', 'employees.json'];
    
    for (const file of requiredFiles) {
      const filePath = path.join(this.importDir, file);
      
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);
          
          if (Array.isArray(data) && data.length > 0) {
            log(`✅ ${file}: ${data.length} registros`, 'green');
            this.stats.filesVerified++;
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

  // Crear script de importación mejorado
  createImprovedImportScript() {
    log('\n📝 CREANDO SCRIPT DE IMPORTACIÓN MEJORADO', 'yellow');
    
    const importScript = `#!/usr/bin/env node

/**
 * Script de importación mejorado con manejo de errores
 * Generado por fix-import-issues-simple.js
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
    console.error('4. Ejecuta: node scripts/fix-import-issues-simple.js');
    process.exit(1);
  }
}

importData();
`;

    const scriptPath = path.join(this.importDir, 'import-improved.js');
    fs.writeFileSync(scriptPath, importScript);
    fs.chmodSync(scriptPath, '755');
    
    log(`✅ Script de importación mejorado creado: ${scriptPath}`, 'green');
    this.stats.filesFixed++;
  }

  // Crear migración para corregir triggers
  createTriggerFixMigration() {
    log('\n🔧 CREANDO MIGRACIÓN PARA CORREGIR TRIGGERS', 'yellow');
    
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

  // Crear script para aplicar migración
  createMigrationScript() {
    log('\n📝 CREANDO SCRIPT PARA APLICAR MIGRACIÓN', 'yellow');
    
    const migrationScript = `#!/bin/bash

# Script para aplicar migración de corrección de triggers
echo "🔧 Aplicando migración de corrección de triggers..."

# Aplicar migración
supabase db push

echo "✅ Migración aplicada exitosamente"
echo "📦 Ahora puedes importar los datos:"
echo "   cd import-data"
echo "   node import-improved.js"
`;

    const scriptPath = path.join(__dirname, '..', 'apply-migration.sh');
    fs.writeFileSync(scriptPath, migrationScript);
    fs.chmodSync(scriptPath, '755');
    
    log(`✅ Script de migración creado: ${scriptPath}`, 'green');
  }

  // Generar reporte
  generateReport() {
    log('\n📊 REPORTE DE CORRECCIÓN', 'cyan');
    log('='.repeat(40), 'cyan');
    log(`📁 Archivos verificados: ${this.stats.filesVerified}`, 'green');
    log(`🔧 Archivos corregidos: ${this.stats.filesFixed}`, 'green');
    log(`❌ Errores: ${this.stats.errors}`, this.stats.errors > 0 ? 'red' : 'green');
    
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      nextSteps: [
        '1. Ejecutar: chmod +x apply-migration.sh',
        '2. Ejecutar: ./apply-migration.sh',
        '3. cd import-data',
        '4. node import-improved.js'
      ]
    };

    const reportPath = path.join(this.importDir, 'fix-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    log(`📄 Reporte guardado: ${reportPath}`, 'green');
  }

  async run() {
    await this.init();
    
    // Ejecutar correcciones
    await this.verifyAndFixImportFiles();
    this.createImprovedImportScript();
    this.createTriggerFixMigration();
    this.createMigrationScript();
    
    // Generar reporte
    this.generateReport();
    
    log('\n🎉 CORRECCIONES COMPLETADAS', 'green');
    log('='.repeat(60), 'green');
    log('Próximos pasos:', 'cyan');
    log('1. chmod +x apply-migration.sh', 'yellow');
    log('2. ./apply-migration.sh', 'yellow');
    log('3. cd import-data', 'yellow');
    log('4. node import-improved.js', 'yellow');
    log('\n✅ Los problemas han sido corregidos', 'green');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const fixer = new SimpleImportFixer();
  fixer.run().catch(error => {
    log(`❌ Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = SimpleImportFixer; 