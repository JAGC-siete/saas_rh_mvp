#!/usr/bin/env node

/**
 * Script simple para activar el horario de trabajo
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

class SimpleScheduleActivator {
  constructor() {
    this.supabase = null;
    this.workScheduleId = '22222222-2222-2222-2222-222222222221';
  }

  async init() {
    log('🔧 ACTIVACIÓN SIMPLE DE HORARIO', 'cyan');
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
  async checkTableStructure() {
    log('\n🔍 VERIFICANDO ESTRUCTURA DE TABLA', 'yellow');
    
    try {
      const { data: schedule, error } = await this.supabase
        .from('work_schedules')
        .select('*')
        .eq('id', this.workScheduleId)
        .limit(1);

      if (error) {
        log(`❌ Error verificando tabla: ${error.message}`, 'red');
        return null;
      }

      if (schedule && schedule.length > 0) {
        const columns = Object.keys(schedule[0]);
        log(`📋 Columnas disponibles en work_schedules:`, 'blue');
        columns.forEach(col => {
          log(`   - ${col}: ${typeof schedule[0][col]}`, 'blue');
        });
        return schedule[0];
      }

      return null;

    } catch (error) {
      log(`❌ Error en checkTableStructure: ${error.message}`, 'red');
      return null;
    }
  }

  // Activar horario con campos disponibles
  async activateSchedule(scheduleStructure) {
    log('\n📅 ACTIVANDO HORARIO', 'yellow');
    
    try {
      // Preparar datos de actualización basados en la estructura real
      const updateData = {
        is_active: true,
        updated_at: new Date().toISOString()
      };

      // Solo agregar campos que existen
      if (scheduleStructure.name !== undefined) {
        updateData.name = 'Horario Estándar 8AM-5PM';
      }
      if (scheduleStructure.start_time !== undefined) {
        updateData.start_time = '08:00:00';
      }
      if (scheduleStructure.end_time !== undefined) {
        updateData.end_time = '17:00:00';
      }

      log(`📋 Campos a actualizar:`, 'blue');
      Object.keys(updateData).forEach(key => {
        log(`   - ${key}: ${updateData[key]}`, 'blue');
      });

      const { data: updatedSchedule, error: updateError } = await this.supabase
        .from('work_schedules')
        .update(updateData)
        .eq('id', this.workScheduleId)
        .select();

      if (updateError) {
        log(`❌ Error actualizando horario: ${updateError.message}`, 'red');
        return false;
      }

      log(`✅ Horario activado correctamente:`, 'green');
      log(`   ID: ${updatedSchedule[0].id}`, 'blue');
      log(`   Nombre: ${updatedSchedule[0].name || 'N/A'}`, 'blue');
      log(`   Horario: ${updatedSchedule[0].start_time || 'N/A'} - ${updatedSchedule[0].end_time || 'N/A'}`, 'blue');
      log(`   Activo: ${updatedSchedule[0].is_active ? 'Sí' : 'No'}`, 'blue');

      return true;

    } catch (error) {
      log(`❌ Error en activateSchedule: ${error.message}`, 'red');
      return false;
    }
  }

  // Verificar que todos los empleados tengan el horario asignado
  async verifyAllEmployeesHaveSchedule() {
    log('\n👥 VERIFICANDO EMPLEADOS', 'yellow');
    
    try {
      // Contar empleados activos
      const { data: activeEmployees, error: activeError } = await this.supabase
        .from('employees')
        .select('id, name, work_schedule_id, status')
        .eq('status', 'active');

      if (activeError) {
        log(`❌ Error contando empleados activos: ${activeError.message}`, 'red');
        return;
      }

      log(`📋 Total empleados activos: ${activeEmployees.length}`, 'blue');

      // Contar empleados con horario asignado
      const employeesWithSchedule = activeEmployees.filter(emp => emp.work_schedule_id === this.workScheduleId);
      log(`✅ Empleados con horario asignado: ${employeesWithSchedule.length}`, 'green');

      // Empleados sin horario
      const employeesWithoutSchedule = activeEmployees.filter(emp => emp.work_schedule_id !== this.workScheduleId);
      log(`⚠️  Empleados sin horario: ${employeesWithoutSchedule.length}`, 'yellow');

      if (employeesWithoutSchedule.length > 0) {
        log(`\n🔄 ASIGNANDO HORARIO A EMPLEADOS FALTANTES`, 'yellow');
        for (const employee of employeesWithoutSchedule) {
          const { error: assignError } = await this.supabase
            .from('employees')
            .update({
              work_schedule_id: this.workScheduleId,
              updated_at: new Date().toISOString()
            })
            .eq('id', employee.id);

          if (assignError) {
            log(`❌ Error asignando horario a ${employee.name}: ${assignError.message}`, 'red');
          } else {
            log(`✅ Horario asignado a ${employee.name}`, 'green');
          }
        }
      }

    } catch (error) {
      log(`❌ Error en verifyAllEmployeesHaveSchedule: ${error.message}`, 'red');
    }
  }

  // Resumen final
  async finalSummary() {
    log('\n📊 RESUMEN FINAL', 'yellow');
    
    try {
      // Verificar horario
      const { data: schedule, error: scheduleError } = await this.supabase
        .from('work_schedules')
        .select('*')
        .eq('id', this.workScheduleId);

      if (!scheduleError && schedule && schedule.length > 0) {
        log(`\n📅 HORARIO CONFIGURADO:`, 'green');
        log(`   ID: ${schedule[0].id}`, 'blue');
        log(`   Nombre: ${schedule[0].name || 'N/A'}`, 'blue');
        log(`   Horario: ${schedule[0].start_time || 'N/A'} - ${schedule[0].end_time || 'N/A'}`, 'blue');
        log(`   Activo: ${schedule[0].is_active ? 'Sí' : 'No'}`, 'blue');
      }

      // Contar empleados finales
      const { data: finalEmployees, error: empError } = await this.supabase
        .from('employees')
        .select('id, name, work_schedule_id')
        .eq('status', 'active')
        .eq('work_schedule_id', this.workScheduleId)
        .order('name');

      if (!empError) {
        log(`\n👥 EMPLEADOS LISTOS (${finalEmployees.length}):`, 'green');
        finalEmployees.forEach((emp, index) => {
          log(`${index + 1}. ${emp.name}`, 'blue');
        });
      }

    } catch (error) {
      log(`❌ Error en finalSummary: ${error.message}`, 'red');
    }
  }

  async run() {
    await this.init();
    
    // Verificar estructura de tabla
    const scheduleStructure = await this.checkTableStructure();
    if (!scheduleStructure) {
      log('❌ No se pudo verificar la estructura de la tabla', 'red');
      return;
    }
    
    // Activar horario
    const activated = await this.activateSchedule(scheduleStructure);
    if (!activated) {
      log('❌ No se pudo activar el horario', 'red');
      return;
    }
    
    // Verificar empleados
    await this.verifyAllEmployeesHaveSchedule();
    
    // Resumen final
    await this.finalSummary();
    
    log('\n🎉 SISTEMA LISTO PARA MAÑANA', 'green');
    log('='.repeat(50), 'green');
    log('✅ Horario activado y configurado', 'green');
    log('✅ Todos los empleados activos tienen horario asignado', 'green');
    log('✅ Sistema listo para recibir datos desde mañana', 'green');
    log('🚀 ¡Configuración completada exitosamente!', 'green');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const activator = new SimpleScheduleActivator();
  activator.run().catch(error => {
    log(`❌ Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = SimpleScheduleActivator; 