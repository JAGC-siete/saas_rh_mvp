#!/usr/bin/env node

/**
 * Script para actualizar el estado de empleados
 * Mantener solo los últimos 34 como activos, el resto como inactivos
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

class EmployeeStatusUpdater {
  constructor() {
    this.supabase = null;
    this.stats = {
      totalEmployees: 0,
      activeEmployees: 0,
      inactiveEmployees: 0,
      updatedEmployees: 0,
      errors: 0
    };
  }

  async init() {
    log('🔄 ACTUALIZANDO ESTADO DE EMPLEADOS', 'cyan');
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

  // Obtener todos los empleados ordenados por fecha de creación
  async getAllEmployees() {
    log('\n📋 OBTENIENDO TODOS LOS EMPLEADOS', 'yellow');
    
    try {
      const { data: employees, error } = await this.supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        log(`❌ Error obteniendo empleados: ${error.message}`, 'red');
        return null;
      }

      this.stats.totalEmployees = employees.length;
      log(`✅ Total de empleados encontrados: ${employees.length}`, 'green');

      return employees;

    } catch (error) {
      log(`❌ Error: ${error.message}`, 'red');
      return null;
    }
  }

  // Actualizar estado de empleados
  async updateEmployeeStatus(employees) {
    log('\n🔄 ACTUALIZANDO ESTADOS DE EMPLEADOS', 'yellow');
    
    if (!employees || employees.length === 0) {
      log('❌ No hay empleados para actualizar', 'red');
      return false;
    }

    const employeesToUpdate = [];
    const maxActiveEmployees = 34;

    // Marcar los primeros 34 como activos, el resto como inactivos
    employees.forEach((employee, index) => {
      const shouldBeActive = index < maxActiveEmployees;
      const newStatus = shouldBeActive ? 'active' : 'inactive';
      
      if (employee.status !== newStatus) {
        employeesToUpdate.push({
          id: employee.id,
          status: newStatus,
          updated_at: new Date().toISOString()
        });
      }
    });

    log(`📊 Empleados a actualizar: ${employeesToUpdate.length}`, 'blue');
    log(`✅ Empleados que serán activos: ${Math.min(employees.length, maxActiveEmployees)}`, 'green');
    log(`❌ Empleados que serán inactivos: ${Math.max(0, employees.length - maxActiveEmployees)}`, 'yellow');

    if (employeesToUpdate.length === 0) {
      log('ℹ️  No hay cambios necesarios', 'blue');
      return true;
    }

    try {
      // Actualizar empleados en lotes para evitar problemas de rendimiento
      const batchSize = 10;
      let updatedCount = 0;

      for (let i = 0; i < employeesToUpdate.length; i += batchSize) {
        const batch = employeesToUpdate.slice(i, i + batchSize);
        
        const { error } = await this.supabase
          .from('employees')
          .upsert(batch, { onConflict: 'id' });

        if (error) {
          log(`❌ Error actualizando lote ${Math.floor(i / batchSize) + 1}: ${error.message}`, 'red');
          this.stats.errors++;
        } else {
          updatedCount += batch.length;
          log(`✅ Lote ${Math.floor(i / batchSize) + 1} actualizado: ${batch.length} empleados`, 'green');
        }
      }

      this.stats.updatedEmployees = updatedCount;
      log(`✅ Total de empleados actualizados: ${updatedCount}`, 'green');

      return true;

    } catch (error) {
      log(`❌ Error actualizando empleados: ${error.message}`, 'red');
      this.stats.errors++;
      return false;
    }
  }

  // Verificar resultado final
  async verifyFinalStatus() {
    log('\n🔍 VERIFICANDO ESTADO FINAL', 'yellow');
    
    try {
      // Contar empleados activos
      const { data: activeEmployees, error: activeError } = await this.supabase
        .from('employees')
        .select('id, name, status, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (activeError) {
        log(`❌ Error contando empleados activos: ${activeError.message}`, 'red');
        return false;
      }

      // Contar empleados inactivos
      const { data: inactiveEmployees, error: inactiveError } = await this.supabase
        .from('employees')
        .select('id, name, status, created_at')
        .eq('status', 'inactive')
        .order('created_at', { ascending: false });

      if (inactiveError) {
        log(`❌ Error contando empleados inactivos: ${inactiveError.message}`, 'red');
        return false;
      }

      this.stats.activeEmployees = activeEmployees.length;
      this.stats.inactiveEmployees = inactiveEmployees.length;

      log(`✅ Empleados activos: ${activeEmployees.length}`, 'green');
      log(`❌ Empleados inactivos: ${inactiveEmployees.length}`, 'yellow');

      // Mostrar los empleados activos
      log('\n👥 EMPLEADOS ACTIVOS (últimos 34):', 'cyan');
      activeEmployees.forEach((emp, index) => {
        log(`${index + 1}. ${emp.name} (${emp.id})`, 'blue');
      });

      return true;

    } catch (error) {
      log(`❌ Error verificando estado final: ${error.message}`, 'red');
      return false;
    }
  }

  // Crear reporte de actualización
  createUpdateReport() {
    log('\n📊 REPORTE DE ACTUALIZACIÓN', 'cyan');
    log('='.repeat(40), 'cyan');
    log(`📈 Total de empleados: ${this.stats.totalEmployees}`, 'green');
    log(`✅ Empleados activos: ${this.stats.activeEmployees}`, 'green');
    log(`❌ Empleados inactivos: ${this.stats.inactiveEmployees}`, 'yellow');
    log(`🔄 Empleados actualizados: ${this.stats.updatedEmployees}`, 'blue');
    log(`❌ Errores: ${this.stats.errors}`, this.stats.errors > 0 ? 'red' : 'green');
    
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      summary: {
        action: 'Actualización de estado de empleados',
        description: 'Mantener solo los últimos 34 empleados como activos',
        result: this.stats.activeEmployees === 34 ? 'Exitoso' : 'Parcial'
      }
    };

    const reportPath = path.join(__dirname, '..', 'import-data', 'employee-status-update.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    log(`📄 Reporte guardado: ${reportPath}`, 'green');
  }

  async run() {
    await this.init();
    
    // Obtener todos los empleados
    const employees = await this.getAllEmployees();
    
    if (employees) {
      // Actualizar estados
      const updateSuccess = await this.updateEmployeeStatus(employees);
      
      if (updateSuccess) {
        // Verificar resultado final
        await this.verifyFinalStatus();
      }
    }
    
    // Crear reporte
    this.createUpdateReport();
    
    log('\n🎉 ACTUALIZACIÓN DE ESTADOS COMPLETADA', 'green');
    log('='.repeat(60), 'green');
    log('Resumen final:', 'cyan');
    log(`✅ Empleados activos: ${this.stats.activeEmployees}/34`, 'green');
    log(`❌ Empleados inactivos: ${this.stats.inactiveEmployees}`, 'yellow');
    log('\n✅ Solo los últimos 34 empleados están activos', 'green');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const updater = new EmployeeStatusUpdater();
  updater.run().catch(error => {
    log(`❌ Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = EmployeeStatusUpdater; 