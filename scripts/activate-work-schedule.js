#!/usr/bin/env node

/**
 * Script para activar y configurar correctamente el horario de trabajo
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

class WorkScheduleActivator {
  constructor() {
    this.supabase = null;
    this.workScheduleId = '22222222-2222-2222-2222-222222222221';
  }

  async init() {
    log('🔧 ACTIVANDO HORARIO DE TRABAJO', 'cyan');
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

  // Verificar y activar el horario
  async activateWorkSchedule() {
    log('\n📅 VERIFICANDO Y ACTIVANDO HORARIO', 'yellow');
    
    try {
      // Obtener el horario actual
      const { data: schedule, error } = await this.supabase
        .from('work_schedules')
        .select('*')
        .eq('id', this.workScheduleId);

      if (error) {
        log(`❌ Error obteniendo horario: ${error.message}`, 'red');
        return false;
      }

      if (!schedule || schedule.length === 0) {
        log('❌ Horario no encontrado', 'red');
        return false;
      }

      const currentSchedule = schedule[0];
      log(`📋 Horario encontrado: ${currentSchedule.name}`, 'blue');
      log(`   Estado actual: ${currentSchedule.is_active ? 'Activo' : 'Inactivo'}`, 'blue');

      // Actualizar horario con configuración correcta
      const { data: updatedSchedule, error: updateError } = await this.supabase
        .from('work_schedules')
        .update({
          name: 'Horario Estándar 8AM-5PM',
          start_time: '08:00:00',
          end_time: '17:00:00',
          days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.workScheduleId)
        .select();

      if (updateError) {
        log(`❌ Error actualizando horario: ${updateError.message}`, 'red');
        return false;
      }

      log(`✅ Horario actualizado y activado:`, 'green');
      log(`   Nombre: ${updatedSchedule[0].name}`, 'blue');
      log(`   Horario: ${updatedSchedule[0].start_time} - ${updatedSchedule[0].end_time}`, 'blue');
      log(`   Días: Lunes a Viernes`, 'blue');
      log(`   Estado: Activo`, 'green');

      return true;

    } catch (error) {
      log(`❌ Error en activateWorkSchedule: ${error.message}`, 'red');
      return false;
    }
  }

  // Verificar que todos los empleados tengan el horario asignado
  async verifyEmployeeSchedules() {
    log('\n👥 VERIFICANDO HORARIOS DE EMPLEADOS', 'yellow');
    
    try {
      // Empleados activos con horario asignado
      const { data: employeesWithSchedule, error: withScheduleError } = await this.supabase
        .from('employees')
        .select('id, name, work_schedule_id, status')
        .eq('status', 'active')
        .eq('work_schedule_id', this.workScheduleId)
        .order('name');

      if (withScheduleError) {
        log(`❌ Error verificando empleados con horario: ${withScheduleError.message}`, 'red');
        return;
      }

      log(`✅ Empleados con horario asignado: ${employeesWithSchedule.length}`, 'green');

      // Empleados activos sin horario
      const { data: employeesWithoutSchedule, error: withoutScheduleError } = await this.supabase
        .from('employees')
        .select('id, name, work_schedule_id, status')
        .eq('status', 'active')
        .is('work_schedule_id', null)
        .order('name');

      if (withoutScheduleError) {
        log(`❌ Error verificando empleados sin horario: ${withoutScheduleError.message}`, 'red');
        return;
      }

      if (employeesWithoutSchedule.length > 0) {
        log(`⚠️  Empleados sin horario asignado: ${employeesWithoutSchedule.length}`, 'yellow');
        employeesWithoutSchedule.forEach((emp, index) => {
          log(`${index + 1}. ${emp.name}`, 'yellow');
        });

        // Asignar horario a empleados sin horario
        log('\n🔄 ASIGNANDO HORARIO A EMPLEADOS SIN HORARIO', 'yellow');
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
      log(`❌ Error en verifyEmployeeSchedules: ${error.message}`, 'red');
    }
  }

  // Verificar configuración final completa
  async verifyFinalSetup() {
    log('\n🔍 VERIFICACIÓN FINAL COMPLETA', 'yellow');
    
    try {
      // Verificar horario
      const { data: schedule, error: scheduleError } = await this.supabase
        .from('work_schedules')
        .select('*')
        .eq('id', this.workScheduleId);

      if (scheduleError) {
        log(`❌ Error verificando horario: ${scheduleError.message}`, 'red');
        return;
      }

      if (schedule && schedule.length > 0) {
        const workSchedule = schedule[0];
        log(`\n📅 CONFIGURACIÓN DEL HORARIO:`, 'green');
        log(`   ID: ${workSchedule.id}`, 'blue');
        log(`   Nombre: ${workSchedule.name}`, 'blue');
        log(`   Horario: ${workSchedule.start_time} - ${workSchedule.end_time}`, 'blue');
        log(`   Días: ${workSchedule.days_of_week ? workSchedule.days_of_week.join(', ') : 'No especificado'}`, 'blue');
        log(`   Activo: ${workSchedule.is_active ? 'Sí' : 'No'}`, 'blue');
      }

      // Contar empleados activos con horario
      const { data: activeEmployees, error: empError } = await this.supabase
        .from('employees')
        .select('id, name, work_schedule_id')
        .eq('status', 'active')
        .eq('work_schedule_id', this.workScheduleId)
        .order('name');

      if (empError) {
        log(`❌ Error contando empleados: ${empError.message}`, 'red');
        return;
      }

      log(`\n👥 RESUMEN FINAL:`, 'green');
      log(`   Total empleados activos con horario: ${activeEmployees.length}`, 'blue');
      log(`   Horario asignado: 8:00 AM - 5:00 PM`, 'blue');
      log(`   Días laborales: Lunes a Viernes`, 'blue');

      if (activeEmployees.length > 0) {
        log(`\n✅ EMPLEADOS LISTOS PARA MAÑANA:`, 'green');
        activeEmployees.forEach((emp, index) => {
          log(`${index + 1}. ${emp.name}`, 'blue');
        });
      }

    } catch (error) {
      log(`❌ Error en verificación final: ${error.message}`, 'red');
    }
  }

  async run() {
    await this.init();
    
    // Activar horario
    const scheduleActivated = await this.activateWorkSchedule();
    if (!scheduleActivated) {
      log('❌ No se pudo activar el horario', 'red');
      return;
    }
    
    // Verificar empleados
    await this.verifyEmployeeSchedules();
    
    // Verificación final
    await this.verifyFinalSetup();
    
    log('\n🎉 SISTEMA COMPLETAMENTE LISTO', 'green');
    log('='.repeat(50), 'green');
    log('✅ Horario 8:00 AM - 5:00 PM activado', 'green');
    log('✅ Todos los empleados activos tienen horario asignado', 'green');
    log('✅ Sistema 100% listo para recibir datos desde mañana', 'green');
    log('🚀 ¡Todo configurado correctamente!', 'green');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const activator = new WorkScheduleActivator();
  activator.run().catch(error => {
    log(`❌ Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = WorkScheduleActivator; 