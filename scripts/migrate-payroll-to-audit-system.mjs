#!/usr/bin/env node

/**
 * Script de migración: Sistema de Auditoría de Nómina
 * 
 * Este script migra los datos existentes de payroll_records al nuevo sistema
 * de auditoría con payroll_runs, payroll_run_lines, y payroll_adjustments.
 * 
 * Uso: node scripts/migrate-payroll-to-audit-system.mjs
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variables de entorno requeridas no encontradas:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Crear cliente Supabase con permisos de servicio
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function migratePayrollData() {
  console.log('🚀 Iniciando migración de sistema de nómina a auditoría...')
  
  try {
    // 1. Verificar que las nuevas tablas existan
    console.log('📋 Verificando estructura de base de datos...')
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['payroll_runs', 'payroll_run_lines', 'payroll_adjustments', 'payroll_snapshots'])
    
    if (tablesError) {
      throw new Error(`Error verificando tablas: ${tablesError.message}`)
    }
    
    if (tables.length < 4) {
      throw new Error('❌ Las nuevas tablas de auditoría no existen. Ejecuta las migraciones SQL primero.')
    }
    
    console.log('✅ Estructura de base de datos verificada')
    
    // 2. Obtener datos existentes de payroll_records
    console.log('📊 Obteniendo datos existentes de payroll_records...')
    
    const { data: existingRecords, error: recordsError } = await supabase
      .from('payroll_records')
      .select(`
        *,
        employees!inner(
          id,
          name,
          employee_code,
          company_id,
          department_id
        )
      `)
      .order('period_start', { ascending: true })
    
    if (recordsError) {
      throw new Error(`Error obteniendo registros existentes: ${recordsError.message}`)
    }
    
    if (!existingRecords || existingRecords.length === 0) {
      console.log('ℹ️ No hay registros de nómina existentes para migrar')
      return
    }
    
    console.log(`📈 Encontrados ${existingRecords.length} registros de nómina para migrar`)
    
    // 3. Agrupar registros por empresa y período
    const groupedRecords = groupRecordsByCompanyAndPeriod(existingRecords)
    console.log(`🏢 Agrupados en ${Object.keys(groupedRecords).length} corridas de planilla`)
    
    // 4. Migrar cada grupo
    let migratedRuns = 0
    let migratedLines = 0
    
    for (const [key, records] of Object.entries(groupedRecords)) {
      console.log(`\n🔄 Migrando corrida: ${key}`)
      
      try {
        const result = await migratePayrollRun(records)
        migratedRuns++
        migratedLines += result.linesCount
        
        console.log(`✅ Corrida migrada: ${result.runId} (${result.linesCount} líneas)`)
      } catch (error) {
        console.error(`❌ Error migrando corrida ${key}:`, error.message)
        // Continuar con la siguiente corrida
      }
    }
    
    console.log(`\n🎉 Migración completada exitosamente!`)
    console.log(`   Corridas migradas: ${migratedRuns}`)
    console.log(`   Líneas migradas: ${migratedLines}`)
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error.message)
    process.exit(1)
  }
}

function groupRecordsByCompanyAndPeriod(records) {
  const grouped = {}
  
  for (const record of records) {
    const companyId = record.employees.company_id
    const periodStart = new Date(record.period_start)
    const year = periodStart.getFullYear()
    const month = periodStart.getMonth() + 1
    const day = periodStart.getDate()
    const quincena = day <= 15 ? 1 : 2
    
    const key = `${companyId}_${year}_${month}_${quincena}`
    
    if (!grouped[key]) {
      grouped[key] = {
        companyId,
        year,
        month,
        quincena,
        records: []
      }
    }
    
    grouped[key].records.push(record)
  }
  
  return grouped
}

async function migratePayrollRun(groupData) {
  const { companyId, year, month, quincena, records } = groupData
  
  // Determinar tipo basado en si hay deducciones
  const hasDeductions = records.some(r => r.total_deductions > 0)
  const tipo = hasDeductions ? 'CON' : 'SIN'
  
  // Crear corrida de planilla
  const { data: runId, error: runError } = await supabase.rpc('create_or_update_payroll_run', {
    p_company_uuid: companyId,
    p_year: year,
    p_month: month,
    p_quincena: quincena,
    p_tipo: tipo,
    p_user_id: 'system-migration' // Usuario especial para migración
  })
  
  if (runError) {
    throw new Error(`Error creando corrida: ${runError.message}`)
  }
  
  // Migrar cada línea
  let linesCount = 0
  
  for (const record of records) {
    try {
      // Calcular horas basadas en días trabajados
      const hours = (record.days_worked || 0) * 8
      
      // Crear línea de planilla
      const { data: lineId, error: lineError } = await supabase.rpc('insert_payroll_line', {
        p_run_id: runId,
        p_company_uuid: companyId,
        p_employee_id: record.employee_id,
        p_calc_hours: hours,
        p_calc_bruto: record.gross_salary || 0,
        p_calc_ihss: record.social_security || 0,
        p_calc_rap: record.professional_tax || 0,
        p_calc_isr: record.income_tax || 0,
        p_calc_neto: record.net_salary || 0
      })
      
      if (lineError) {
        console.error(`Error creando línea para empleado ${record.employees.name}:`, lineError.message)
        continue
      }
      
      linesCount++
      
      // Si hay diferencias entre valores calculados y efectivos, crear ajustes
      if (record.gross_salary !== record.base_salary) {
        await createAdjustmentIfDifferent(lineId, companyId, 'bruto', record.base_salary, record.gross_salary)
      }
      
    } catch (error) {
      console.error(`Error procesando línea para empleado ${record.employees.name}:`, error.message)
    }
  }
  
  return { runId, linesCount }
}

async function createAdjustmentIfDifferent(lineId, companyId, field, oldValue, newValue) {
  if (oldValue !== newValue && newValue !== null && newValue !== undefined) {
    try {
      await supabase.rpc('apply_payroll_adjustment', {
        p_run_line_id: lineId,
        p_company_uuid: companyId,
        p_field: field,
        p_new_value: newValue,
        p_reason: 'Migración automática - valor original preservado',
        p_user_id: 'system-migration'
      })
    } catch (error) {
      console.error(`Error creando ajuste para campo ${field}:`, error.message)
    }
  }
}

// Función principal
if (import.meta.url === `file://${process.argv[1]}`) {
  migratePayrollData()
    .then(() => {
      console.log('✅ Script de migración completado')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error en script de migración:', error)
      process.exit(1)
    })
}

export { migratePayrollData }
