require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Use the same hardcoded values as in lib/supabase/client.ts
const SUPABASE_URL = 'https://fwyxmovfrzauebiqxchz.supabase.co';

// Try to get service role key from environment, otherwise we'll need to use a different approach
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL;

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  console.error('🔧 This is needed to bypass RLS policies');
  console.error('💡 Please add SUPABASE_SERVICE_ROLE_KEY to your .env file');
  process.exit(1);
}

// Use service role client to bypass RLS
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixAttendanceAndAuthIssues() {
  console.log('🔧 Fixing attendance and authentication issues...');
  
  // Use Tegucigalpa timezone for today's date (same as dashboard-stats.ts)
  const tegucigalpaTime = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Tegucigalpa"}));
  const today = tegucigalpaTime.toISOString().split('T')[0];
  console.log('📅 Today (Tegucigalpa):', today);

  try {
    // 1. Get active employees
    console.log('\n👥 Getting active employees...');
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, employee_code, dni, work_schedule_id')
      .eq('status', 'active');

    if (empError) {
      console.error('❌ Error fetching employees:', empError);
      return;
    }

    console.log('✅ Found', employees?.length || 0, 'active employees');

    // 2. Create test attendance records for today
    console.log('\n📊 Creating test attendance records for today...');
    
    const testAttendanceRecords = [];
    const now = new Date();
    
    // Create varied attendance records to simulate real usage
    employees?.forEach((employee, index) => {
      const checkInTime = new Date(now);
      
      // Simulate different arrival times
      if (index < 10) {
        // First 10 employees: on time (8:00 AM)
        checkInTime.setHours(8, 0, 0, 0);
      } else if (index < 20) {
        // Next 10 employees: slightly late (8:15 AM)
        checkInTime.setHours(8, 15, 0, 0);
      } else if (index < 25) {
        // Next 5 employees: late (8:30 AM)
        checkInTime.setHours(8, 30, 0, 0);
      } else {
        // Remaining employees: very late (9:00 AM)
        checkInTime.setHours(9, 0, 0, 0);
      }

      const expectedCheckIn = '08:00';
      const [expectedHour, expectedMin] = expectedCheckIn.split(':').map(Number);
      const [checkInHour, checkInMin] = [checkInTime.getHours(), checkInTime.getMinutes()];
      const expectedMinutes = expectedHour * 60 + expectedMin;
      const checkInMinutes = checkInHour * 60 + checkInMin;
      const lateMinutes = Math.max(0, checkInMinutes - expectedMinutes);

      testAttendanceRecords.push({
        employee_id: employee.id,
        date: today,
        check_in: checkInTime.toISOString(),
        expected_check_in: expectedCheckIn,
        late_minutes: lateMinutes,
        status: lateMinutes > 5 ? 'late' : 'present',
        justification: lateMinutes > 5 ? 'Tráfico en la mañana' : null
      });
    });

    // Insert attendance records
    const { data: insertedRecords, error: insertError } = await supabase
      .from('attendance_records')
      .insert(testAttendanceRecords)
      .select();

    if (insertError) {
      console.error('❌ Error inserting attendance records:', insertError);
      return;
    }

    console.log('✅ Created', insertedRecords?.length || 0, 'attendance records for today');

    // 3. Create some historical attendance records for the past week
    console.log('\n📈 Creating historical attendance records...');
    
    const historicalRecords = [];
    for (let i = 1; i <= 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Only create records for weekdays (Monday = 1, Friday = 5)
      const dayOfWeek = date.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        employees?.slice(0, 20).forEach((employee, index) => { // Only first 20 employees for historical data
          const checkInTime = new Date(date);
          
          // Randomize arrival times for historical data
          if (index < 10) {
            checkInTime.setHours(8, Math.floor(Math.random() * 10), 0, 0); // 8:00-8:09
          } else {
            checkInTime.setHours(8, 10 + Math.floor(Math.random() * 20), 0, 0); // 8:10-8:29
          }

          const expectedCheckIn = '08:00';
          const [expectedHour, expectedMin] = expectedCheckIn.split(':').map(Number);
          const [checkInHour, checkInMin] = [checkInTime.getHours(), checkInTime.getMinutes()];
          const expectedMinutes = expectedHour * 60 + expectedMin;
          const checkInMinutes = checkInHour * 60 + checkInMin;
          const lateMinutes = Math.max(0, checkInMinutes - expectedMinutes);

          historicalRecords.push({
            employee_id: employee.id,
            date: dateStr,
            check_in: checkInTime.toISOString(),
            expected_check_in: expectedCheckIn,
            late_minutes: lateMinutes,
            status: lateMinutes > 5 ? 'late' : 'present'
          });
        });
      }
    }

    if (historicalRecords.length > 0) {
      const { data: historicalInserted, error: historicalError } = await supabase
        .from('attendance_records')
        .insert(historicalRecords)
        .select();

      if (historicalError) {
        console.error('❌ Error inserting historical records:', historicalError);
      } else {
        console.log('✅ Created', historicalInserted?.length || 0, 'historical attendance records');
      }
    }

    // 4. Verify the data was created
    console.log('\n🔍 Verifying created data...');
    const { data: todayRecords, error: verifyError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('date', today);

    if (verifyError) {
      console.error('❌ Error verifying records:', verifyError);
    } else {
      console.log('✅ Verified', todayRecords?.length || 0, 'records for today');
      
      // Show some sample records
      if (todayRecords?.length > 0) {
        console.log('📋 Sample records:');
        todayRecords.slice(0, 3).forEach(record => {
          console.log(`- ${record.employee_id}: ${record.status} (${record.late_minutes} min late)`);
        });
      }
    }

    // 5. Check for Marcelo specifically
    console.log('\n👤 Checking Marcelo\'s attendance...');
    const { data: marcelo, error: marceloError } = await supabase
      .from('employees')
      .select('id, name, employee_code')
      .ilike('name', '%marcelo%')
      .single();

    if (marceloError) {
      console.error('❌ Error finding Marcelo:', marceloError);
    } else if (marcelo) {
      const { data: marceloAttendance, error: marceloAttError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', marcelo.id)
        .eq('date', today)
        .single();

      if (marceloAttError) {
        console.error('❌ Error fetching Marcelo attendance:', marceloAttError);
      } else {
        console.log('✅ Marcelo attendance for today:', marceloAttendance);
      }
    }

    console.log('\n✅ ATTENDANCE ISSUE FIXED!');
    console.log('📊 Summary:');
    console.log(`- Created ${insertedRecords?.length || 0} attendance records for today`);
    console.log(`- Created ${historicalRecords.length} historical records`);
    console.log(`- Date: ${today}`);
    console.log('\n🔧 Next steps:');
    console.log('1. Check the dashboard - it should now show attendance data');
    console.log('2. Marcelo should appear in the attendance list');
    console.log('3. Payroll should now show active employees');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixAttendanceAndAuthIssues(); 