#!/usr/bin/env node

/**
 * Complete Payroll Test: Creates payroll run with employee data and tests all functionality
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Test configuration
const CURRENT_TENANT = '00000000-0000-0000-0000-000000000001'
const CURRENT_YEAR = 2025
const CURRENT_MONTH = 8
const CURRENT_QUINCENA = 1

async function testCompletePayrollSystem() {
  console.log('🧪 Starting Complete Payroll System Test...')
  console.log(`🏢 Tenant: ${CURRENT_TENANT}`)
  console.log(`📅 Period: ${CURRENT_YEAR}-${CURRENT_MONTH.toString().padStart(2, '0')} Q${CURRENT_QUINCENA}`)
  
  try {
    // STEP 1: Get active employees for the tenant
    console.log('\n👥 STEP 1: Getting active employees...')
    const employees = await getActiveEmployees()
    console.log(`✅ Found ${employees.length} active employees`)
    
    // STEP 2: Create payroll run
    console.log('\n📋 STEP 2: Creating payroll run...')
    const runId = await createPayrollRun()
    console.log(`✅ Payroll run created: ${runId}`)
    
    // STEP 3: Create payroll lines for each employee
    console.log('\n📊 STEP 3: Creating payroll lines...')
    const lineIds = await createPayrollLines(runId, employees)
    console.log(`✅ Created ${lineIds.length} payroll lines`)
    
    // STEP 4: Test adjustments
    console.log('\n✏️ STEP 4: Testing adjustments...')
    const adjustmentResult = await testAdjustments(lineIds[0])
    console.log(`✅ Adjustment test successful: ${adjustmentResult.adjustment_id}`)
    
    // STEP 5: Test snapshots
    console.log('\n📸 STEP 5: Testing snapshots...')
    await testSnapshots(lineIds[0])
    console.log(`✅ Snapshot test successful`)
    
    // STEP 6: Test authorization
    console.log('\n✅ STEP 6: Testing authorization...')
    await testAuthorization(runId)
    console.log(`✅ Authorization test successful`)
    
    // STEP 7: Validate final state
    console.log('\n🔍 STEP 7: Validating final state...')
    await validateFinalState(runId, lineIds[0])
    console.log(`✅ Final state validation successful`)
    
    console.log('\n🎉 Complete payroll system test successful!')
    
    // Return test results for reporting
    return {
      run_id: runId,
      employee_count: employees.length,
      line_count: lineIds.length,
      adjustment_id: adjustmentResult.adjustment_id,
      status: 'authorized'
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    throw error
  }
}

async function getActiveEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, base_salary, dni')
    .eq('company_id', CURRENT_TENANT)
    .eq('status', 'active')
    .limit(5) // Limit to 5 for testing
  
  if (error) {
    throw new Error(`Failed to get employees: ${error.message}`)
  }
  
  return data || []
}

async function createPayrollRun() {
  const { data, error } = await supabase.rpc('create_or_update_payroll_run', {
    p_company_uuid: CURRENT_TENANT,
    p_year: CURRENT_YEAR,
    p_month: CURRENT_MONTH,
    p_quincena: CURRENT_QUINCENA,
    p_tipo: 'CON',
    p_user_id: CURRENT_TENANT
  })
  
  if (error) {
    throw new Error(`Failed to create payroll run: ${error.message}`)
  }
  
  return data
}

async function createPayrollLines(runId, employees) {
  const lineIds = []
  
  for (const employee of employees) {
    // Calculate basic payroll values
    const baseSalary = Number(employee.base_salary) || 15000
    const daysWorked = 15 // Assuming 15 days for quincena 1
    const salaryProportional = (baseSalary / 30) * daysWorked
    
    // For quincena 1, no deductions
    const ihss = 0
    const rap = 0
    const isr = 0
    const netSalary = salaryProportional
    
    const { data: lineId, error } = await supabase.rpc('insert_payroll_line', {
      p_run_id: runId,
      p_company_uuid: CURRENT_TENANT,
      p_employee_id: employee.id,
      p_calc_hours: daysWorked * 8,
      p_calc_bruto: salaryProportional,
      p_calc_ihss: ihss,
      p_calc_rap: rap,
      p_calc_isr: isr,
      p_calc_neto: netSalary
    })
    
    if (error) {
      throw new Error(`Failed to create line for employee ${employee.name}: ${error.message}`)
    }
    
    lineIds.push(lineId)
  }
  
  return lineIds
}

async function testAdjustments(lineId) {
  // Get current line values
  const { data: line, error: lineError } = await supabase
    .from('payroll_run_lines')
    .select('calc_ihss, eff_ihss')
    .eq('id', lineId)
    .single()
  
  if (lineError) {
    throw new Error(`Failed to get line: ${lineError.message}`)
  }
  
  const newValue = Number(line.calc_ihss) + 100
  
  // Create adjustment
  const { data: adjustment, error: adjustmentError } = await supabase
    .from('payroll_adjustments')
    .insert({
      run_line_id: lineId,
      company_uuid: CURRENT_TENANT,
      field: 'ihss',
      old_value: line.eff_ihss,
      new_value: newValue,
      reason: 'ajuste prueba staging',
      user_id: CURRENT_TENANT
    })
    .select('id')
    .single()
  
  if (adjustmentError) {
    throw new Error(`Failed to create adjustment: ${adjustmentError.message}`)
  }
  
  // Verify the adjustment was applied
  const { data: updatedLine, error: updateError } = await supabase
    .from('payroll_run_lines')
    .select('eff_ihss, edited')
    .eq('id', lineId)
    .single()
  
  if (updateError) {
    throw new Error(`Failed to verify line update: ${updateError.message}`)
  }
  
  if (updatedLine.eff_ihss !== newValue) {
    throw new Error(`Line not updated: expected ${newValue}, got ${updatedLine.eff_ihss}`)
  }
  
  if (!updatedLine.edited) {
    throw new Error(`Line edited flag not set to true`)
  }
  
  return {
    adjustment_id: adjustment.id,
    old_value: line.eff_ihss,
    new_value: newValue
  }
}

async function testSnapshots(lineId) {
  // Check if snapshots were created
  const { data: snapshots, error } = await supabase
    .from('payroll_snapshots')
    .select('version, created_at')
    .eq('run_line_id', lineId)
    .order('version')
  
  if (error) {
    throw new Error(`Failed to get snapshots: ${error.message}`)
  }
  
  if (snapshots.length < 2) {
    throw new Error(`Expected at least 2 snapshots, got ${snapshots.length}`)
  }
  
  // Should have version 0 (initial) and version 1 (after adjustment)
  const versions = snapshots.map(s => s.version).sort()
  if (!versions.includes(0) || !versions.includes(1)) {
    throw new Error(`Missing expected snapshots. Found versions: ${versions.join(', ')}`)
  }
  
  console.log(`   ✅ Snapshots created: versions ${versions.join(', ')}`)
}

async function testAuthorization(runId) {
  // Update status to authorized
  const { error: updateError } = await supabase
    .from('payroll_runs')
    .update({ 
      status: 'authorized',
      updated_at: new Date().toISOString()
    })
    .eq('id', runId)
    .eq('company_uuid', CURRENT_TENANT)
  
  if (updateError) {
    throw new Error(`Failed to authorize run: ${updateError.message}`)
  }
  
  // Verify status change
  const { data: run, error: runError } = await supabase
    .from('payroll_runs')
    .select('status')
    .eq('id', runId)
    .single()
  
  if (runError) {
    throw new Error(`Failed to verify run status: ${runError.message}`)
  }
  
  if (run.status !== 'authorized') {
    throw new Error(`Run not authorized: expected 'authorized', got '${run.status}'`)
  }
}

async function validateFinalState(runId, lineId) {
  console.log('🔍 Validating final database state...')
  
  // 1. Verify run status
  const { data: run, error: runError } = await supabase
    .from('payroll_runs')
    .select('status, company_uuid, year, month, quincena')
    .eq('id', runId)
    .single()
  
  if (runError) {
    throw new Error(`Run validation failed: ${runError.message}`)
  }
  
  console.log(`   ✅ Run: ${run.status} | ${run.year}-${run.month} Q${run.quincena}`)
  console.log(`   ✅ Company: ${run.company_uuid}`)
  
  // 2. Verify line count and company isolation
  const { data: lines, error: linesError } = await supabase
    .from('payroll_run_lines')
    .select('id, company_uuid, edited')
    .eq('run_id', runId)
  
  if (linesError) {
    throw new Error(`Lines validation failed: ${linesError.message}`)
  }
  
  const editedLines = lines.filter(l => l.edited)
  console.log(`   ✅ Lines: ${lines.length} total, ${editedLines.length} edited`)
  
  // 3. Verify adjustments
  const { data: adjustments, error: adjustmentsError } = await supabase
    .from('payroll_adjustments')
    .select('field, old_value, new_value, reason')
    .eq('run_line_id', lineId)
  
  if (adjustmentsError) {
    throw new Error(`Adjustments validation failed: ${adjustmentsError.message}`)
  }
  
  console.log(`   ✅ Adjustments: ${adjustments.length} created`)
  adjustments.forEach(adj => {
    console.log(`      - ${adj.field}: ${adj.old_value} → ${adj.new_value} (${adj.reason})`)
  })
  
  // 4. Verify snapshots
  const { data: snapshots, error: snapshotsError } = await supabase
    .from('payroll_snapshots')
    .select('version, created_at')
    .eq('run_line_id', lineId)
    .order('version')
  
  if (snapshotsError) {
    throw new Error(`Snapshots validation failed: ${snapshotsError.message}`)
  }
  
  console.log(`   ✅ Snapshots: ${snapshots.length} versions`)
  snapshots.forEach(snap => {
    console.log(`      - v${snap.version}: ${snap.created_at}`)
  })
  
  // 5. Verify effective values
  const { data: line, error: lineError } = await supabase
    .from('payroll_run_lines')
    .select('calc_ihss, eff_ihss, edited')
    .eq('id', lineId)
    .single()
  
  if (lineError) {
    throw new Error(`Line validation failed: ${lineError.message}`)
  }
  
  console.log(`   ✅ Values: calc_ihss=${line.calc_ihss}, eff_ihss=${line.eff_ihss}`)
  console.log(`   ✅ Edited flag: ${line.edited}`)
  
  if (line.calc_ihss === line.eff_ihss && line.edited) {
    throw new Error(`Line marked as edited but calc and eff values are the same`)
  }
  
  console.log('   ✅ Final state validation completed')
}

// Run the complete test
if (import.meta.url === `file://${process.argv[1]}`) {
  testCompletePayrollSystem()
    .then((results) => {
      console.log('\n📊 Test Results Summary:')
      console.log(`   Run ID: ${results.run_id}`)
      console.log(`   Employees: ${results.employee_count}`)
      console.log(`   Lines: ${results.line_count}`)
      console.log(`   Adjustment ID: ${results.adjustment_id}`)
      console.log(`   Final Status: ${results.status}`)
      console.log('\n🎯 Complete payroll system test successful!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error.message)
      process.exit(1)
    })
}

export { testCompletePayrollSystem }
