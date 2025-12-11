#!/usr/bin/env node

/**
 * Script para asignar horarios específicos a empleados de Prohalca
 * y marcar el resto como hourly
 * 
 * Empleados con horarios fijos:
 * - Administración: 7:00 AM - 4:00 PM
 * - Mantenimiento: 7:00 AM - 3:00 PM
 * - Aseo: 8:00 AM - 5:00 PM
 * 
 * Todos los demás: pay_type = 'hourly'
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
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Configuración de empleados y horarios
const EMPLOYEE_SCHEDULES = {
  'Administración': {
    start: '07:00:00',
    end: '16:00:00',
    employees: [
      'Ricardo Estrada',
      'Lizbeth Banegas',
      'Yesica Avila',
      'Henry Flores',
      'Santos Sanchez'
    ]
  },
  'Mantenimiento': {
    start: '07:00:00',
    end: '15:00:00',
    employees: [
      'Saul Alvarado',
      'Noe Flores',
      'Aristides Molina'
    ]
  },
  'Aseo': {
    start: '08:00:00',
    end: '17:00:00',
    employees: [
      'Meylin Reina'
    ]
  }
};

const COMPANY_ID = '4dc1c9de-dd12-4e4b-b76a-783d4ee5d07c';

class ScheduleAssigner {
  constructor() {
    this.supabase = null;
    this.foundEmployees = new Map(); // name -> employee data
    this.scheduleIds = new Map(); // department -> schedule_id
  }

  async init() {
    log('🕐 ASIGNANDO HORARIOS A EMPLEADOS DE PROHALCA', 'cyan');
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
      }
    }

    const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      log('❌ Error: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos', 'red');
      process.exit(1);
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    log('✅ Cliente Supabase inicializado', 'green');
  }

  // Buscar empleado por nombre (coincidencia parcial, case-insensitive)
  async findEmployeeByName(name) {
    const searchTerms = name.toLowerCase().split(' ');
    
    // Buscar por coincidencia parcial en el nombre
    const { data: employees, error } = await this.supabase
      .from('employees')
      .select('id, name, department_id, departments(name)')
      .eq('company_id', COMPANY_ID)
      .eq('status', 'active')
      .ilike('name', `%${name}%`);

    if (error) {
      log(`❌ Error buscando empleado "${name}": ${error.message}`, 'red');
      return null;
    }

    if (!employees || employees.length === 0) {
      return null;
    }

    // Si hay múltiples coincidencias, intentar encontrar la más cercana
    if (employees.length > 1) {
      // Buscar la que tenga más palabras en común
      const bestMatch = employees.reduce((best, emp) => {
        const empNameWords = emp.name.toLowerCase().split(' ');
        const matchCount = searchTerms.filter(term => 
          empNameWords.some(word => word.includes(term) || term.includes(word))
        ).length;
        return matchCount > best.matchCount ? { employee: emp, matchCount } : best;
      }, { employee: employees[0], matchCount: 0 });
      
      return bestMatch.employee;
    }

    return employees[0];
  }

  // Crear o obtener work_schedule para un departamento
  async getOrCreateSchedule(department, startTime, endTime) {
    const scheduleName = `Horario ${department} ${startTime.slice(0, 5)}-${endTime.slice(0, 5)}`;
    
    // Verificar si ya existe un schedule con este nombre
    const { data: existing, error: checkError } = await this.supabase
      .from('work_schedules')
      .select('id')
      .eq('company_id', COMPANY_ID)
      .eq('name', scheduleName)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      log(`❌ Error verificando schedule: ${checkError.message}`, 'red');
      return null;
    }

    if (existing) {
      log(`✅ Schedule existente encontrado: ${scheduleName}`, 'green');
      return existing.id;
    }

    // Crear nuevo schedule
    const { data: newSchedule, error: createError } = await this.supabase
      .from('work_schedules')
      .insert({
        company_id: COMPANY_ID,
        name: scheduleName,
        monday_start: startTime,
        monday_end: endTime,
        tuesday_start: startTime,
        tuesday_end: endTime,
        wednesday_start: startTime,
        wednesday_end: endTime,
        thursday_start: startTime,
        thursday_end: endTime,
        friday_start: startTime,
        friday_end: endTime,
        saturday_start: null,
        saturday_end: null,
        sunday_start: null,
        sunday_end: null,
        break_duration: 60,
        timezone: 'America/Tegucigalpa'
      })
      .select('id')
      .single();

    if (createError) {
      log(`❌ Error creando schedule: ${createError.message}`, 'red');
      return null;
    }

    log(`✅ Schedule creado: ${scheduleName}`, 'green');
    return newSchedule.id;
  }

  // Procesar empleados y asignar horarios
  async processEmployees() {
    log('\n👥 BUSCANDO Y ASIGNANDO HORARIOS', 'yellow');
    log('='.repeat(60), 'yellow');

    // Primero, buscar todos los empleados y crear schedules
    for (const [department, config] of Object.entries(EMPLOYEE_SCHEDULES)) {
      log(`\n📋 Procesando ${department}`, 'magenta');
      
      // Crear schedule para este departamento
      const scheduleId = await this.getOrCreateSchedule(
        department,
        config.start,
        config.end
      );

      if (!scheduleId) {
        log(`⚠️  No se pudo crear schedule para ${department}, continuando...`, 'yellow');
        continue;
      }

      this.scheduleIds.set(department, scheduleId);

      // Buscar cada empleado
      for (const employeeName of config.employees) {
        log(`  🔍 Buscando: ${employeeName}`, 'blue');
        const employee = await this.findEmployeeByName(employeeName);

        if (employee) {
          this.foundEmployees.set(employeeName.toLowerCase(), {
            ...employee,
            department,
            scheduleId
          });
          log(`  ✅ Encontrado: ${employee.name} (ID: ${employee.id})`, 'green');
        } else {
          log(`  ⚠️  No encontrado: ${employeeName}`, 'yellow');
        }
      }
    }

    // Asignar schedules a los empleados encontrados
    log('\n📝 ASIGNANDO HORARIOS A EMPLEADOS', 'yellow');
    log('='.repeat(60), 'yellow');

    let assignedCount = 0;
    for (const [name, employeeData] of this.foundEmployees.entries()) {
      const { id, scheduleId, department } = employeeData;

      // Actualizar empleado con schedule y pay_type = 'fixed'
      const { error: updateError } = await this.supabase
        .from('employees')
        .update({
          work_schedule_id: scheduleId,
          pay_type: 'fixed'
        })
        .eq('id', id);

      if (updateError) {
        log(`  ❌ Error actualizando ${employeeData.name}: ${updateError.message}`, 'red');
      } else {
        log(`  ✅ ${employeeData.name} → ${department} (${scheduleId.slice(0, 8)}...)`, 'green');
        assignedCount++;
      }
    }

    log(`\n✅ ${assignedCount} empleados con horarios asignados`, 'green');
    return assignedCount;
  }

  // Marcar todos los demás empleados como hourly
  async markRemainingAsHourly() {
    log('\n🔄 MARCANDO EMPLEADOS RESTANTES COMO HOURLY', 'yellow');
    log('='.repeat(60), 'yellow');

    // Obtener IDs de empleados que ya tienen horario asignado
    const assignedIds = Array.from(this.foundEmployees.values()).map(e => e.id);

    // Obtener todos los empleados activos de la empresa
    const { data: allEmployees, error: fetchError } = await this.supabase
      .from('employees')
      .select('id, name, pay_type')
      .eq('company_id', COMPANY_ID)
      .eq('status', 'active');

    if (fetchError) {
      log(`❌ Error obteniendo empleados: ${fetchError.message}`, 'red');
      return 0;
    }

    // Filtrar empleados que NO están en la lista de asignados
    const remainingEmployees = allEmployees.filter(emp => !assignedIds.includes(emp.id));

    if (remainingEmployees.length === 0) {
      log('✅ No hay empleados restantes para marcar como hourly', 'green');
      return 0;
    }

    // Actualizar cada empleado restante
    let updatedCount = 0;
    for (const emp of remainingEmployees) {
      // Solo actualizar si no es ya hourly
      if (emp.pay_type !== 'hourly') {
        const { error: updateError } = await this.supabase
          .from('employees')
          .update({ pay_type: 'hourly' })
          .eq('id', emp.id);

        if (updateError) {
          log(`  ❌ Error actualizando ${emp.name}: ${updateError.message}`, 'red');
        } else {
          updatedCount++;
        }
      }
    }

    log(`✅ ${updatedCount} empleados marcados como hourly`, 'green');

    if (remainingEmployees.length > 0 && remainingEmployees.length <= 20) {
      log('\n📋 Empleados marcados como hourly:', 'blue');
      remainingEmployees.forEach(emp => {
        log(`  - ${emp.name}`, 'blue');
      });
    } else if (remainingEmployees.length > 20) {
      log(`\n📋 ${remainingEmployees.length} empleados marcados como hourly (lista demasiado larga para mostrar)`, 'blue');
    }

    return updatedCount;
  }

  // Ejecutar el proceso completo
  async run() {
    try {
      await this.init();
      
      const assignedCount = await this.processEmployees();
      const hourlyCount = await this.markRemainingAsHourly();

      log('\n' + '='.repeat(60), 'cyan');
      log('📊 RESUMEN', 'cyan');
      log('='.repeat(60), 'cyan');
      log(`✅ Empleados con horarios fijos: ${assignedCount}`, 'green');
      log(`✅ Empleados marcados como hourly: ${hourlyCount}`, 'green');
      log(`📊 Total procesado: ${assignedCount + hourlyCount}`, 'cyan');
      log('='.repeat(60), 'cyan');
      log('\n✅ Proceso completado exitosamente', 'green');

    } catch (error) {
      log(`\n❌ Error en el proceso: ${error.message}`, 'red');
      log(error.stack, 'red');
      process.exit(1);
    }
  }
}

// Ejecutar script
if (require.main === module) {
  const assigner = new ScheduleAssigner();
  assigner.run();
}

module.exports = ScheduleAssigner;

