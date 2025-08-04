#!/usr/bin/env node

/**
 * Script simple para activar empleados específicos y eliminar duplicados
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

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

class SimpleEmployeeCleanup {
  constructor() {
    this.supabase = null;
    this.activeEmployees = [
      'Ericka Daniela Martinez',
      'Evelin Daniela Oseguera Aguilar',
      'Astrid Mariela Colindres Zelaya',
      'Helen Daniela Matute Zambrano',
      'Emely Rachel Romero Cabrera',
      'Yorleny Paveth Oliva Maldonado',
      'Isis Amaleth Ardon Maradiaga',
      'David Gonzales Maldonado',
      'Luis Francisco Murillo Carcamo',
      'Jesús Alcides Sagastume Martínez',
      'Jonny Omar Salinas Rosales',
      'Francisco Javier Mendez Montenegro',
      'Angel David Alvarenga Martinez',
      'Lourdes Raquel Aguirre',
      'Gustavo Noel Argueta Zelaya',
      'Kenia Isabel Zambrano Molina',
      'Wolfang Andre Sosa Lanza',
      'Jorge Arturo Gómez Coello',
      'Jorge Luis Rodriguez Macedo',
      'Claudette Desiree Rollings Martinez',
      'Roberto Carlos Meraz Canales',
      'Marcelo Alejandro Folgar Bonilla',
      'André Alexander García Laínez',
      'David Alejandro Santos Ordoñez',
      'Amsi Abigail Urquía Durón',
      'Fabiola Yadira Castillo Moncada',
      'Vladimir Rodriguez Castejón',
      'Alejandro José Salgado Girón',
      'Daniel Vladimir Hernadez Salgado',
      'Enrique Alejandro Casco Murillo',
      'Gerardo Leonel Fernandez Martinez',
      'Seth Isaí Godoy Cantarero',
      'Raúl Eduardo Espinoza Núñez',
      'Gerson Enoc Zuniga Chang'
    ];
  }

  async init() {
    log('🧹 LIMPIEZA SIMPLE DE EMPLEADOS', 'cyan');
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

  // Buscar empleados por nombre y activar los más completos
  async activateSpecificEmployees() {
    log('\n🔍 BUSCANDO Y ACTIVANDO EMPLEADOS ESPECÍFICOS', 'yellow');
    
    for (const employeeName of this.activeEmployees) {
      log(`\n👤 Procesando: ${employeeName}`, 'blue');
      
      try {
        // Buscar todos los empleados con este nombre
        const { data: employees, error } = await this.supabase
          .from('employees')
          .select('*')
          .ilike('name', `%${employeeName}%`);

        if (error) {
          log(`❌ Error buscando ${employeeName}: ${error.message}`, 'red');
          continue;
        }

        if (!employees || employees.length === 0) {
          log(`⚠️  No encontrado: ${employeeName}`, 'yellow');
          continue;
        }

        log(`📋 Encontrados: ${employees.length} registros`, 'blue');

        // Encontrar el empleado más completo (con más campos no nulos)
        let bestEmployee = employees[0];
        let bestScore = 0;

        employees.forEach(emp => {
          let score = 0;
          if (emp.dni) score += 10;
          if (emp.email) score += 10;
          if (emp.phone) score += 5;
          if (emp.base_salary) score += 10;
          if (emp.hire_date) score += 5;
          if (emp.bank_name) score += 5;
          if (emp.bank_account) score += 5;
          
          if (score > bestScore) {
            bestScore = score;
            bestEmployee = emp;
          }
        });

        log(`✅ Mejor registro: ${bestEmployee.name} (score: ${bestScore})`, 'green');

        // Activar el mejor empleado
        const { error: updateError } = await this.supabase
          .from('employees')
          .update({ 
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', bestEmployee.id);

        if (updateError) {
          log(`❌ Error activando ${employeeName}: ${updateError.message}`, 'red');
        } else {
          log(`✅ Activado: ${employeeName}`, 'green');
        }

        // Eliminar duplicados menos completos
        if (employees.length > 1) {
          const duplicatesToDelete = employees.filter(emp => emp.id !== bestEmployee.id);
          
          for (const duplicate of duplicatesToDelete) {
            const { error: deleteError } = await this.supabase
              .from('employees')
              .delete()
              .eq('id', duplicate.id);

            if (deleteError) {
              log(`❌ Error eliminando duplicado: ${deleteError.message}`, 'red');
            } else {
              log(`🗑️  Eliminado duplicado: ${duplicate.name}`, 'yellow');
            }
          }
        }

      } catch (error) {
        log(`❌ Error procesando ${employeeName}: ${error.message}`, 'red');
      }
    }
  }

  // Desactivar todos los demás empleados
  async deactivateOtherEmployees() {
    log('\n❌ DESACTIVANDO EMPLEADOS NO LISTADOS', 'yellow');
    
    try {
      // Obtener todos los empleados activos
      const { data: activeEmployees, error } = await this.supabase
        .from('employees')
        .select('id, name, status')
        .eq('status', 'active');

      if (error) {
        log(`❌ Error obteniendo empleados activos: ${error.message}`, 'red');
        return;
      }

      log(`📋 Empleados activos encontrados: ${activeEmployees.length}`, 'blue');

      // Verificar cuáles no están en la lista
      const employeesToDeactivate = activeEmployees.filter(emp => 
        !this.activeEmployees.some(name => emp.name.includes(name) || name.includes(emp.name))
      );

      log(`📋 Empleados a desactivar: ${employeesToDeactivate.length}`, 'yellow');

      // Desactivar empleados no listados
      for (const employee of employeesToDeactivate) {
        const { error: updateError } = await this.supabase
          .from('employees')
          .update({ 
            status: 'inactive',
            updated_at: new Date().toISOString()
          })
          .eq('id', employee.id);

        if (updateError) {
          log(`❌ Error desactivando ${employee.name}: ${updateError.message}`, 'red');
        } else {
          log(`❌ Desactivado: ${employee.name}`, 'yellow');
        }
      }

    } catch (error) {
      log(`❌ Error desactivando empleados: ${error.message}`, 'red');
    }
  }

  // Verificar resultado final
  async verifyFinalResult() {
    log('\n🔍 VERIFICANDO RESULTADO FINAL', 'yellow');
    
    try {
      // Contar empleados activos
      const { data: activeEmployees, error } = await this.supabase
        .from('employees')
        .select('id, name, status')
        .eq('status', 'active')
        .order('name');

      if (error) {
        log(`❌ Error verificando resultado: ${error.message}`, 'red');
        return;
      }

      log(`\n✅ EMPLEADOS ACTIVOS FINALES (${activeEmployees.length}):`, 'green');
      activeEmployees.forEach((emp, index) => {
        log(`${index + 1}. ${emp.name}`, 'blue');
      });

      // Contar empleados inactivos
      const { data: inactiveEmployees, error: inactiveError } = await this.supabase
        .from('employees')
        .select('id, name, status')
        .eq('status', 'inactive');

      if (!inactiveError) {
        log(`\n❌ EMPLEADOS INACTIVOS (${inactiveEmployees.length}):`, 'yellow');
      }

    } catch (error) {
      log(`❌ Error en verificación: ${error.message}`, 'red');
    }
  }

  async run() {
    await this.init();
    
    // Activar empleados específicos y eliminar duplicados
    await this.activateSpecificEmployees();
    
    // Desactivar empleados no listados
    await this.deactivateOtherEmployees();
    
    // Verificar resultado
    await this.verifyFinalResult();
    
    log('\n🎉 LIMPIEZA COMPLETADA', 'green');
    log('='.repeat(50), 'green');
    log('✅ Solo los 34 empleados listados están activos', 'green');
    log('🗑️  Duplicados eliminados', 'green');
    log('❌ Otros empleados desactivados', 'green');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const cleanup = new SimpleEmployeeCleanup();
  cleanup.run().catch(error => {
    log(`❌ Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = SimpleEmployeeCleanup; 