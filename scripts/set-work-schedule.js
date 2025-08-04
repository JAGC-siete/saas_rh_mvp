#!/usr/bin/env node

/**
 * Script para asignar horario de trabajo a todos los empleados activos
 * Horario: 8:00 AM - 5:00 PM
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

class WorkScheduleManager {
  constructor() {
    this.supabase = null;
    this.workScheduleId = '22222222-2222-2222-2222-222222222221';
    this.scheduleName = 'Horario Estándar 8AM-5PM';
    this.startTime = '08:00:00';
    this.endTime = '17:00:00';
  }

  async init() {
    log('🕐 CONFIGURANDO HORARIOS DE TRABAJO', 'cyan');
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

  // Crear o verificar el horario de trabajo
  async createWorkSchedule() {
    log('\n📅 CREANDO HORARIO DE TRABAJO', 'yellow');
    
    try {
      // Verificar si el horario ya existe
      const { data: existingSchedule, error: checkError } = await this.supabase
        .from('work_schedules')
        .select('*')
        .eq('id', this.workScheduleId);

      if (checkError) {
        log(`❌ Error verificando horario: ${checkError.message}`, 'red');
        return false;
      }

      if (existingSchedule && existingSchedule.length > 0) {
        log(`✅ Horario ya existe: ${existingSchedule[0].name}`, 'green');
        return true;
      }

      // Crear nuevo horario
      const { data: newSchedule, error: createError } = await this.supabase
        .from('work_schedules')
        .insert({
          id: this.workScheduleId,
          name: this.scheduleName,
          start_time: this.startTime,
          end_time: this.endTime,
          days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();

      if (createError) {
        log(`❌ Error creando horario: ${createError.message}`, 'red');
        return false;
      }

      log(`✅ Horario creado: ${newSchedule[0].name}`, 'green');
      log(`   🕐 ${this.startTime} - ${this.endTime}`, 'blue');
      log(`   📅 Lunes a Viernes`, 'blue');
      return true;

    } catch (error) {
      log(`❌ Error en createWorkSchedule: ${error.message}`, 'red');
      return false;
    }
  }

  // Obtener todos los empleados activos
  async getActiveEmployees() {
    log('\n👥 OBTENIENDO EMPLEADOS ACTIVOS', 'yellow');
    
    try {
      const { data: employees, error } = await this.supabase
        .from('employees')
        .select('id, name, work_schedule_id, status')
        .eq('status', 'active')
        .order('name');

      if (error) {
        log(`❌ Error obteniendo empleados: ${error.message}`, 'red');
        return [];
      }

      log(`📋 Empleados activos encontrados: ${employees.length}`, 'blue');
      return employees;

    } catch (error) {
      log(`❌ Error en getActiveEmployees: ${error.message}`, 'red');
      return [];
    }
  }

  // Asignar horario a empleados
  async assignScheduleToEmployees(employees) {
    log('\n🔄 ASIGNANDO HORARIOS A EMPLEADOS', 'yellow');
    
    let successCount = 0;
    let errorCount = 0;

    for (const employee of employees) {
      try {
        log(`\n👤 Procesando: ${employee.name}`, 'blue');
        
        // Verificar si ya tiene el horario correcto
        if (employee.work_schedule_id === this.workScheduleId) {
          log(`✅ Ya tiene el horario correcto`, 'green');
          successCount++;
          continue;
        }

        // Actualizar horario
        const { error: updateError } = await this.supabase
          .from('employees')
          .update({
            work_schedule_id: this.workScheduleId,
            updated_at: new Date().toISOString()
          })
          .eq('id', employee.id);

        if (updateError) {
          log(`❌ Error actualizando ${employee.name}: ${updateError.message}`, 'red');
          errorCount++;
        } else {
          log(`✅ Horario asignado: ${employee.name}`, 'green');
          successCount++;
        }

      } catch (error) {
        log(`❌ Error procesando ${employee.name}: ${error.message}`, 'red');
        errorCount++;
      }
    }

    log(`\n📊 RESUMEN DE ASIGNACIÓN:`, 'cyan');
    log(`✅ Exitosos: ${successCount}`, 'green');
    log(`❌ Errores: ${errorCount}`, 'red');
  }

  // Verificar configuración final
  async verifyFinalConfiguration() {
    log('\n🔍 VERIFICANDO CONFIGURACIÓN FINAL', 'yellow');
    
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
        log(`\n📅 HORARIO CONFIGURADO:`, 'green');
        log(`   Nombre: ${schedule[0].name}`, 'blue');
        log(`   Horario: ${schedule[0].start_time} - ${schedule[0].end_time}`, 'blue');
        log(`   Activo: ${schedule[0].is_active ? 'Sí' : 'No'}`, 'blue');
      }

      // Verificar empleados con horario asignado
      const { data: employeesWithSchedule, error: empError } = await this.supabase
        .from('employees')
        .select('id, name, work_schedule_id')
        .eq('status', 'active')
        .eq('work_schedule_id', this.workScheduleId)
        .order('name');

      if (empError) {
        log(`❌ Error verificando empleados: ${empError.message}`, 'red');
        return;
      }

      log(`\n👥 EMPLEADOS CON HORARIO ASIGNADO (${employeesWithSchedule.length}):`, 'green');
      employeesWithSchedule.forEach((emp, index) => {
        log(`${index + 1}. ${emp.name}`, 'blue');
      });

      // Verificar empleados sin horario
      const { data: employeesWithoutSchedule, error: noScheduleError } = await this.supabase
        .from('employees')
        .select('id, name, work_schedule_id')
        .eq('status', 'active')
        .is('work_schedule_id', null);

      if (!noScheduleError && employeesWithoutSchedule.length > 0) {
        log(`\n⚠️  EMPLEADOS SIN HORARIO (${employeesWithoutSchedule.length}):`, 'yellow');
        employeesWithoutSchedule.forEach((emp, index) => {
          log(`${index + 1}. ${emp.name}`, 'yellow');
        });
      }

    } catch (error) {
      log(`❌ Error en verificación: ${error.message}`, 'red');
    }
  }

  async run() {
    await this.init();
    
    // Crear horario de trabajo
    const scheduleCreated = await this.createWorkSchedule();
    if (!scheduleCreated) {
      log('❌ No se pudo crear el horario', 'red');
      return;
    }
    
    // Obtener empleados activos
    const employees = await this.getActiveEmployees();
    if (employees.length === 0) {
      log('❌ No hay empleados activos', 'red');
      return;
    }
    
    // Asignar horario a empleados
    await this.assignScheduleToEmployees(employees);
    
    // Verificar configuración final
    await this.verifyFinalConfiguration();
    
    log('\n🎉 CONFIGURACIÓN DE HORARIOS COMPLETADA', 'green');
    log('='.repeat(50), 'green');
    log('✅ Horario 8:00 AM - 5:00 PM configurado', 'green');
    log('✅ Todos los empleados activos tienen horario asignado', 'green');
    log('✅ Sistema listo para recibir datos desde mañana', 'green');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const manager = new WorkScheduleManager();
  manager.run().catch(error => {
    log(`❌ Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = WorkScheduleManager; 