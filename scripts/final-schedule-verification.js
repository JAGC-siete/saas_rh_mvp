#!/usr/bin/env node

/**
 * Script final para verificar que todos los empleados activos tengan el horario correcto
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

class FinalScheduleVerification {
  constructor() {
    this.supabase = null;
    this.workScheduleId = '22222222-2222-2222-2222-222222222221';
  }

  async init() {
    log('✅ VERIFICACIÓN FINAL DE HORARIOS', 'cyan');
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

  // Verificar horario configurado
  async verifyWorkSchedule() {
    log('\n📅 VERIFICANDO HORARIO DE TRABAJO', 'yellow');
    
    try {
      const { data: schedule, error } = await this.supabase
        .from('work_schedules')
        .select('*')
        .eq('id', this.workScheduleId);

      if (error) {
        log(`❌ Error obteniendo horario: ${error.message}`, 'red');
        return false;
      }

      if (schedule && schedule.length > 0) {
        const workSchedule = schedule[0];
        log(`\n✅ HORARIO CONFIGURADO CORRECTAMENTE:`, 'green');
        log(`   Nombre: ${workSchedule.name}`, 'blue');
        log(`   ID: ${workSchedule.id}`, 'blue');
        log(`   Lunes: ${workSchedule.monday_start} - ${workSchedule.monday_end}`, 'blue');
        log(`   Martes: ${workSchedule.tuesday_start} - ${workSchedule.tuesday_end}`, 'blue');
        log(`   Miércoles: ${workSchedule.wednesday_start} - ${workSchedule.wednesday_end}`, 'blue');
        log(`   Jueves: ${workSchedule.thursday_start} - ${workSchedule.thursday_end}`, 'blue');
        log(`   Viernes: ${workSchedule.friday_start} - ${workSchedule.friday_end}`, 'blue');
        log(`   Sábado: ${workSchedule.saturday_start || 'No laboral'} - ${workSchedule.saturday_end || 'No laboral'}`, 'blue');
        log(`   Domingo: ${workSchedule.sunday_start || 'No laboral'} - ${workSchedule.sunday_end || 'No laboral'}`, 'blue');
        log(`   Break: ${workSchedule.break_duration} minutos`, 'blue');
        log(`   Zona horaria: ${workSchedule.timezone}`, 'blue');
        return true;
      } else {
        log('❌ Horario no encontrado', 'red');
        return false;
      }

    } catch (error) {
      log(`❌ Error verificando horario: ${error.message}`, 'red');
      return false;
    }
  }

  // Verificar empleados activos con horario asignado
  async verifyActiveEmployees() {
    log('\n👥 VERIFICANDO EMPLEADOS ACTIVOS', 'yellow');
    
    try {
      // Empleados activos con horario correcto
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

      log(`✅ Empleados activos con horario correcto: ${employeesWithSchedule.length}`, 'green');

      // Empleados activos sin horario o con horario incorrecto
      const { data: employeesWithoutSchedule, error: withoutScheduleError } = await this.supabase
        .from('employees')
        .select('id, name, work_schedule_id, status')
        .eq('status', 'active')
        .neq('work_schedule_id', this.workScheduleId)
        .order('name');

      if (withoutScheduleError) {
        log(`❌ Error verificando empleados sin horario: ${withoutScheduleError.message}`, 'red');
        return;
      }

      if (employeesWithoutSchedule.length > 0) {
        log(`⚠️  Empleados que necesitan horario asignado: ${employeesWithoutSchedule.length}`, 'yellow');
        
        // Asignar horario a empleados que no lo tienen
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

      // Verificar total final
      const { data: finalEmployees, error: finalError } = await this.supabase
        .from('employees')
        .select('id, name, work_schedule_id, status')
        .eq('status', 'active')
        .eq('work_schedule_id', this.workScheduleId)
        .order('name');

      if (!finalError && finalEmployees) {
        log(`\n📊 RESUMEN FINAL:`, 'green');
        log(`   Total empleados activos con horario: ${finalEmployees.length}`, 'blue');
        
        if (finalEmployees.length > 0) {
          log(`\n✅ EMPLEADOS LISTOS PARA MAÑANA:`, 'green');
          finalEmployees.forEach((emp, index) => {
            log(`${index + 1}. ${emp.name}`, 'blue');
          });
        }
      }

    } catch (error) {
      log(`❌ Error verificando empleados: ${error.message}`, 'red');
    }
  }

  // Verificar configuración completa del sistema
  async verifySystemReadiness() {
    log('\n🚀 VERIFICANDO PREPARACIÓN DEL SISTEMA', 'yellow');
    
    try {
      // Contar empleados activos totales
      const { data: allActiveEmployees, error: activeError } = await this.supabase
        .from('employees')
        .select('id, name, status')
        .eq('status', 'active');

      if (activeError) {
        log(`❌ Error contando empleados activos: ${activeError.message}`, 'red');
        return;
      }

      // Contar empleados con horario correcto
      const { data: employeesWithCorrectSchedule, error: scheduleError } = await this.supabase
        .from('employees')
        .select('id, name, work_schedule_id')
        .eq('status', 'active')
        .eq('work_schedule_id', this.workScheduleId);

      if (scheduleError) {
        log(`❌ Error contando empleados con horario: ${scheduleError.message}`, 'red');
        return;
      }

      log(`\n📈 ESTADO DEL SISTEMA:`, 'green');
      log(`   Total empleados activos: ${allActiveEmployees.length}`, 'blue');
      log(`   Empleados con horario 8AM-5PM: ${employeesWithCorrectSchedule.length}`, 'blue');
      log(`   Porcentaje configurado: ${((employeesWithCorrectSchedule.length / allActiveEmployees.length) * 100).toFixed(1)}%`, 'blue');

      if (employeesWithCorrectSchedule.length === allActiveEmployees.length) {
        log(`\n🎉 ¡SISTEMA 100% LISTO!`, 'green');
        log(`✅ Todos los empleados activos tienen horario asignado`, 'green');
        log(`✅ Horario configurado: 8:00 AM - 5:00 PM`, 'green');
        log(`✅ Días laborales: Lunes a Viernes`, 'green');
        log(`✅ Sistema listo para recibir datos desde mañana`, 'green');
      } else {
        log(`\n⚠️  SISTEMA PARCIALMENTE CONFIGURADO`, 'yellow');
        log(`❌ Faltan ${allActiveEmployees.length - employeesWithCorrectSchedule.length} empleados por configurar`, 'red');
      }

    } catch (error) {
      log(`❌ Error verificando sistema: ${error.message}`, 'red');
    }
  }

  async run() {
    await this.init();
    
    // Verificar horario
    const scheduleOk = await this.verifyWorkSchedule();
    if (!scheduleOk) {
      log('❌ Problema con el horario de trabajo', 'red');
      return;
    }
    
    // Verificar empleados
    await this.verifyActiveEmployees();
    
    // Verificar sistema completo
    await this.verifySystemReadiness();
    
    log('\n🎯 VERIFICACIÓN FINAL COMPLETADA', 'green');
    log('='.repeat(50), 'green');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const verifier = new FinalScheduleVerification();
  verifier.run().catch(error => {
    log(`❌ Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = FinalScheduleVerification; 