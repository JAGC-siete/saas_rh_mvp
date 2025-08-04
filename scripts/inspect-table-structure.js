#!/usr/bin/env node

/**
 * Script para inspeccionar la estructura real de la tabla employees
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

class TableInspector {
  constructor() {
    this.supabase = null;
  }

  async init() {
    log('🔍 INSPECCIONANDO ESTRUCTURA DE TABLA EMPLOYEES', 'cyan');
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

  // Inspeccionar estructura de tabla employees
  async inspectEmployeesTable() {
    log('\n👥 INSPECCIONANDO TABLA EMPLOYEES', 'yellow');
    
    try {
      // Intentar diferentes consultas para entender la estructura
      log('🔍 Probando diferentes consultas...', 'blue');

      // 1. Intentar obtener todos los campos
      const { data: allFields, error: allFieldsError } = await this.supabase
        .from('employees')
        .select('*')
        .limit(1);

      if (allFieldsError) {
        log(`❌ Error obteniendo todos los campos: ${allFieldsError.message}`, 'red');
      } else {
        log('✅ Consulta SELECT * exitosa', 'green');
        if (allFields && allFields.length > 0) {
          log('📋 Campos encontrados:', 'green');
          Object.keys(allFields[0]).forEach(field => {
            log(`   - ${field}: ${typeof allFields[0][field]}`, 'blue');
          });
        }
      }

      // 2. Intentar obtener solo campos específicos
      const testFields = ['id', 'name', 'email', 'dni', 'role', 'position', 'job_title', 'salary', 'base_salary'];
      
      for (const field of testFields) {
        try {
          const { data, error } = await this.supabase
            .from('employees')
            .select(field)
            .limit(1);

          if (error) {
            log(`❌ Campo '${field}': ${error.message}`, 'red');
          } else {
            log(`✅ Campo '${field}': Existe`, 'green');
          }
        } catch (err) {
          log(`❌ Campo '${field}': Error - ${err.message}`, 'red');
        }
      }

      // 3. Intentar insertar un registro de prueba para ver qué campos acepta
      log('\n🧪 Probando inserción de prueba...', 'yellow');
      
      const testRecord = {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Test Employee',
        email: 'test@example.com',
        dni: '12345678'
      };

      const { error: insertError } = await this.supabase
        .from('employees')
        .insert(testRecord);

      if (insertError) {
        log(`❌ Error en inserción de prueba: ${insertError.message}`, 'red');
        
        // Analizar el error para entender qué campos faltan
        if (insertError.message.includes('column') && insertError.message.includes('does not exist')) {
          log('🔍 Analizando campos faltantes...', 'yellow');
          
          // Intentar con diferentes combinaciones de campos
          const fieldCombinations = [
            { id: '00000000-0000-0000-0000-000000000000', name: 'Test' },
            { id: '00000000-0000-0000-0000-000000000000', email: 'test@example.com' },
            { id: '00000000-0000-0000-0000-000000000000', dni: '12345678' }
          ];

          for (const combo of fieldCombinations) {
            try {
              const { error } = await this.supabase
                .from('employees')
                .insert(combo);
              
              if (!error) {
                log(`✅ Inserción exitosa con campos: ${Object.keys(combo).join(', ')}`, 'green');
                // Limpiar el registro de prueba
                await this.supabase
                  .from('employees')
                  .delete()
                  .eq('id', '00000000-0000-0000-0000-000000000000');
                break;
              }
            } catch (err) {
              log(`❌ Combo ${Object.keys(combo).join(', ')}: ${err.message}`, 'red');
            }
          }
        }
      } else {
        log('✅ Inserción de prueba exitosa', 'green');
        // Limpiar el registro de prueba
        await this.supabase
          .from('employees')
          .delete()
          .eq('id', '00000000-0000-0000-0000-000000000000');
      }

    } catch (error) {
      log(`❌ Error inspeccionando tabla: ${error.message}`, 'red');
    }
  }

  // Crear estructura de datos basada en la inspección
  createCorrectedDataStructure() {
    log('\n🔧 CREANDO ESTRUCTURA DE DATOS CORREGIDA', 'yellow');
    
    // Basado en la inspección, crear estructura mínima
    const correctedStructure = {
      id: 'UUID',
      name: 'string',
      email: 'string',
      dni: 'string'
    };

    const correctedEmployees = [
      {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Ericka Daniela Martinez',
        email: 'danu.martinez07@gmail.com',
        dni: '0801199910071'
      },
      {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Evelin Daniela Oseguera Aguilar',
        email: 'evelynoseguera2201@gmail.com',
        dni: '0801200104394'
      }
    ];

    const correctedPath = path.join(__dirname, '..', 'import-data', 'employees-corrected.json');
    fs.writeFileSync(correctedPath, JSON.stringify(correctedEmployees, null, 2));
    
    log(`✅ Estructura corregida guardada en: ${correctedPath}`, 'green');
    log('📋 Estructura mínima:', 'green');
    Object.entries(correctedStructure).forEach(([field, type]) => {
      log(`   - ${field}: ${type}`, 'blue');
    });
  }

  async run() {
    await this.init();
    await this.inspectEmployeesTable();
    this.createCorrectedDataStructure();
    
    log('\n🎉 INSPECCIÓN COMPLETADA', 'green');
    log('='.repeat(60), 'green');
    log('Revisa los resultados arriba para entender la estructura real', 'cyan');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const inspector = new TableInspector();
  inspector.run().catch(error => {
    log(`❌ Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = TableInspector; 