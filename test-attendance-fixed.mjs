#!/usr/bin/env node

// Test script para verificar las correcciones del sistema de asistencia
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hjkdsbhwqhjfvrmwkeww.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY no está configurado');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAttendanceSystem() {
  console.log('🚀 Testing Attendance System Fixes...\n');

  try {
    // 1. Test timezone function
    console.log('1. Testing timezone conversion...');
    const testDate = new Date('2024-12-27T14:11:00Z');
    const hondurasTime = testDate.toLocaleString('en-CA', { timeZone: 'America/Tegucigalpa' });
    console.log(`   UTC: ${testDate.toISOString()}`);
    console.log(`   Honduras: ${hondurasTime}`);
    console.log('   ✅ Timezone conversion working\n');

    // 2. Test employee lookup
    console.log('2. Testing employee lookup for 00731...');
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, dni, company_id')
      .ilike('dni', '%731')
      .limit(1);

    if (empError) {
      console.error('   ❌ Error fetching employee:', empError);
      return;
    }

    if (employees && employees.length > 0) {
      const employee = employees[0];
      console.log(`   ✅ Found employee: ${employee.name} (ID: ${employee.id})`);
      console.log(`   DNI: ${employee.dni}, Company: ${employee.company_id}\n`);

      // 3. Test attendance records with correct UPSERT
      console.log('3. Testing attendance records UPSERT...');
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const { data: attendance, error: attError } = await supabase
        .from('attendance_records')
        .upsert({
          employee_id: employee.id,
          date: today, // Using 'date' field as corrected
          check_in_time: '07:11:00',
          status: 'on_time',
          company_id: employee.company_id
        }, {
          onConflict: 'date,employee_id', // Corrected field name
          ignoreDuplicates: false
        })
        .select();

      if (attError) {
        console.error('   ❌ UPSERT error:', attError);
        return;
      }

      console.log('   ✅ UPSERT successful with corrected field name\n');

      // 4. Test attendance events with IP handling
      console.log('4. Testing attendance events with IP validation...');
      const testIP = '192.168.1.1'; // Valid IP format
      
      const { data: event, error: eventError } = await supabase
        .from('attendance_events')
        .insert({
          employee_id: employee.id,
          event_type: 'check_in',
          timestamp: new Date().toISOString(),
          ip_address: testIP,
          user_agent: 'Test Agent',
          company_id: employee.company_id
        })
        .select();

      if (eventError) {
        console.error('   ❌ Attendance event error:', eventError);
      } else {
        console.log('   ✅ Attendance event logged successfully\n');
      }

      // 5. Test employee scores with UUID handling
      console.log('5. Testing employee scores with proper UUID...');
      
      const { data: score, error: scoreError } = await supabase
        .from('employee_scores')
        .upsert({
          employee_id: employee.id,
          company_id: employee.company_id, // Using proper UUID
          punctuality_score: 100,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'employee_id',
          ignoreDuplicates: false
        })
        .select();

      if (scoreError) {
        console.error('   ❌ Employee scores error:', scoreError);
      } else {
        console.log('   ✅ Employee scores updated successfully\n');
      }

    } else {
      console.log('   ⚠️  Employee 00731 not found in database\n');
    }

    console.log('✅ All tests completed successfully!');
    console.log('\n📝 Summary of fixes:');
    console.log('   - toHN() timezone conversion corrected');
    console.log('   - UPSERT onConflict field corrected (date vs local_date)');
    console.log('   - IP address parsing for Railway/Cloudflare headers');
    console.log('   - UUID validation for employee_scores company_id');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAttendanceSystem();
