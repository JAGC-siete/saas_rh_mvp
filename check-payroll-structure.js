#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPayrollStructure() {
  console.log('🔍 VERIFICANDO ESTRUCTURA DE PAYROLL_RECORDS');
  console.log('===========================================');

  try {
    // 1. Verificar estructura actual
    const { data: sample, error: sampleError } = await supabase
      .from('payroll_records')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('❌ Error obteniendo muestra:', sampleError);
      return;
    }

    console.log('✅ Columnas existentes:', Object.keys(sample[0] || {}));

    // 2. Intentar insertar con solo las columnas que existen
    const testRecord = {
      employee_id: '33333333-3333-3333-3333-333333333331',
      period_start: '2024-07-01',
      period_end: '2024-07-15',
      period_type: 'biweekly',
      base_salary: 35000,
      overtime_hours: 0,
      overtime_amount: 0,
      bonuses: 0,
      commissions: 0,
      other_earnings: 0,
      gross_salary: 35000,
      income_tax: 2000,
      social_security: 1500,
      professional_tax: 500,
      other_deductions: 0,
      total_deductions: 4000,
      net_salary: 31000,
      days_worked: 15,
      days_absent: 0,
      late_days: 0,
      status: 'pending',
      notes: 'Prueba de estructura - ' + new Date().toISOString(),
      metadata: {}
    };

    console.log('\n📋 Intentando inserción con columnas básicas...');
    const { data: insertResult, error: insertError } = await supabase
      .from('payroll_records')
      .insert(testRecord)
      .select();

    if (insertError) {
      console.error('❌ Error en inserción básica:', insertError);
    } else {
      console.log('✅ Inserción básica exitosa:', insertResult[0].id);
      
      // Limpiar
      await supabase
        .from('payroll_records')
        .delete()
        .eq('id', insertResult[0].id);
    }

    // 3. Probar con generated_at
    console.log('\n📋 Probando con generated_at...');
    const testRecordWithGenerated = {
      ...testRecord,
      generated_at: new Date().toISOString()
    };

    const { data: insertGenerated, error: generatedError } = await supabase
      .from('payroll_records')
      .insert(testRecordWithGenerated)
      .select();

    if (generatedError) {
      console.error('❌ Error con generated_at:', generatedError);
    } else {
      console.log('✅ Inserción con generated_at exitosa:', insertGenerated[0].id);
      
      // Limpiar
      await supabase
        .from('payroll_records')
        .delete()
        .eq('id', insertGenerated[0].id);
    }

    // 4. Probar con generated_by
    console.log('\n📋 Probando con generated_by...');
    const testRecordWithGeneratedBy = {
      ...testRecord,
      generated_by: 'test-user-id'
    };

    const { data: insertGeneratedBy, error: generatedByError } = await supabase
      .from('payroll_records')
      .insert(testRecordWithGeneratedBy)
      .select();

    if (generatedByError) {
      console.error('❌ Error con generated_by:', generatedByError);
    } else {
      console.log('✅ Inserción con generated_by exitosa:', insertGeneratedBy[0].id);
      
      // Limpiar
      await supabase
        .from('payroll_records')
        .delete()
        .eq('id', insertGeneratedBy[0].id);
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

checkPayrollStructure(); 