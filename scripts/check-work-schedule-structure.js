#!/usr/bin/env node

/**
 * Script para verificar la estructura de la tabla work_schedules
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

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

class WorkScheduleStructureChecker {
  constructor() {
    this.supabase = null;
  }

  async init() {
    log('🔍 VERIFICANDO ESTRUCTURA DE WORK_SCHEDULES', 'cyan');
    log('='.repeat(50), 'cyan');

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

  // Verificar estructura de la tabla work_schedules
  async checkWorkScheduleStructure() {
    log('\n📋 VERIFICANDO ESTRUCTURA DE LA TABLA', 'yellow');
    
    try {
      // Obtener información de la tabla
      const { data: tableInfo, error: tableError } = await this.supabase
        .from('work_schedules')
        .select('*')
        .limit(1);

      if (tableError) {
        log(`❌ Error accediendo a la tabla: ${tableError.message}`, 'red');
        return;
      }

      if (tableInfo && tableInfo.length > 0) {
        const sampleRecord = tableInfo[0];
        log(`\n📊 ESTRUCTURA DE WORK_SCHEDULES:`, 'green');
        log(`Columnas disponibles:`, 'blue');
        
        Object.keys(sampleRecord).forEach(column => {
          const value = sampleRecord[column];
          const type = typeof value;
          log(`   - ${column}: ${type} (${value})`, 'blue');
        });
      } else {
        log('⚠️  La tabla work_schedules está vacía', 'yellow');
      }

    } catch (error) {
      log(`❌ Error verificando estructura: ${error.message}`, 'red');
    }
  }

  // Verificar horario específico
  async checkSpecificSchedule() {
    log('\n🔍 VERIFICANDO HORARIO ESPECÍFICO', 'yellow');
    
    const workScheduleId = '22222222-2222-2222-2222-222222222221';
    
    try {
      const { data: schedule, error } = await this.supabase
        .from('work_schedules')
        .select('*')
        .eq('id', workScheduleId);

      if (error) {
        log(`❌ Error obteniendo horario: ${error.message}`, 'red');
        return;
      }

      if (schedule && schedule.length > 0) {
        const workSchedule = schedule[0];
        log(`\n📅 HORARIO ENCONTRADO:`, 'green');
        log(`   ID: ${workSchedule.id}`, 'blue');
        log(`   Nombre: ${workSchedule.name}`, 'blue');
        log(`   Start Time: ${workSchedule.start_time}`, 'blue');
        log(`   End Time: ${workSchedule.end_time}`, 'blue');
        log(`   Is Active: ${workSchedule.is_active}`, 'blue');
        log(`   Created At: ${workSchedule.created_at}`, 'blue');
        log(`   Updated At: ${workSchedule.updated_at}`, 'blue');
        
        // Mostrar todas las columnas disponibles
        log(`\n📋 TODAS LAS COLUMNAS:`, 'green');
        Object.keys(workSchedule).forEach(key => {
          log(`   ${key}: ${workSchedule[key]}`, 'blue');
        });
      } else {
        log('❌ Horario no encontrado', 'red');
      }

    } catch (error) {
      log(`❌ Error verificando horario específico: ${error.message}`, 'red');
    }
  }

  // Verificar todos los horarios
  async checkAllSchedules() {
    log('\n📋 VERIFICANDO TODOS LOS HORARIOS', 'yellow');
    
    try {
      const { data: schedules, error } = await this.supabase
        .from('work_schedules')
        .select('*')
        .order('name');

      if (error) {
        log(`❌ Error obteniendo horarios: ${error.message}`, 'red');
        return;
      }

      if (schedules && schedules.length > 0) {
        log(`\n📅 HORARIOS DISPONIBLES (${schedules.length}):`, 'green');
        schedules.forEach((schedule, index) => {
          log(`${index + 1}. ${schedule.name}`, 'blue');
          log(`   ID: ${schedule.id}`, 'blue');
          log(`   Activo: ${schedule.is_active ? 'Sí' : 'No'}`, 'blue');
          log(`   Horario: ${schedule.start_time || 'N/A'} - ${schedule.end_time || 'N/A'}`, 'blue');
          log('', 'blue');
        });
      } else {
        log('⚠️  No hay horarios en la tabla', 'yellow');
      }

    } catch (error) {
      log(`❌ Error verificando todos los horarios: ${error.message}`, 'red');
    }
  }

  async run() {
    await this.init();
    
    // Verificar estructura
    await this.checkWorkScheduleStructure();
    
    // Verificar horario específico
    await this.checkSpecificSchedule();
    
    // Verificar todos los horarios
    await this.checkAllSchedules();
    
    log('\n✅ VERIFICACIÓN COMPLETADA', 'green');
    log('='.repeat(50), 'green');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const checker = new WorkScheduleStructureChecker();
  checker.run().catch(error => {
    log(`❌ Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = WorkScheduleStructureChecker; 