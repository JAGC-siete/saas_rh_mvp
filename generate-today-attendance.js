const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateTodayAttendance() {
    try {
        console.log('🔄 Generating today\'s attendance data...');
        
        // Get all active employees
        const { data: employees, error: empError } = await supabase
            .from('employees')
            .select('id, name')
            .eq('status', 'active');
        
        if (empError) {
            console.error('❌ Error fetching employees:', empError);
            return;
        }
        
        console.log(`📊 Found ${employees.length} active employees`);
        
        // Today's date
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // First, delete any existing attendance records for today
        console.log('🗑️ Clearing existing attendance records for today...');
        const { error: deleteError } = await supabase
            .from('attendance_records')
            .delete()
            .eq('date', todayStr);
        
        if (deleteError) {
            console.error('❌ Error clearing today\'s attendance:', deleteError);
            return;
        }
        
        console.log('✅ Today\'s attendance records cleared');
        
        // Generate attendance records for today
        const todayAttendance = [];
        
        employees.forEach(employee => {
            let checkInTime, checkOutTime, status, justification;
            
            // Check if this is Marcelo (who was 2 hours late)
            if (employee.name.includes('Marcelo')) {
                // Marcelo arrived 2 hours late (10:00 AM instead of 8:00 AM)
                checkInTime = new Date(today);
                checkInTime.setHours(10, 0, 0, 0); // 10:00 AM
                
                checkOutTime = new Date(today);
                checkOutTime.setHours(19, 0, 0, 0); // 7:00 PM (worked full day)
                
                status = 'late';
                justification = ''; // No justification
                
                console.log(`⚠️ Marcelo will be marked as late (arrived at 10:00 AM)`);
            } else {
                // Everyone else was on time (between 7:45 AM and 8:00 AM)
                const checkInHour = 7;
                const checkInMinute = Math.floor(Math.random() * 15) + 45; // 45-59 minutes
                checkInTime = new Date(today);
                checkInTime.setHours(checkInHour, checkInMinute, 0, 0);
                
                // Check-out between 5:00 PM and 6:00 PM
                const checkOutHour = 17;
                const checkOutMinute = Math.floor(Math.random() * 60); // 0-59 minutes
                checkOutTime = new Date(today);
                checkOutTime.setHours(checkOutHour, checkOutMinute, 0, 0);
                
                status = 'present';
                justification = '';
            }
            
            todayAttendance.push({
                employee_id: employee.id,
                date: todayStr,
                check_in: checkInTime.toISOString(),
                check_out: checkOutTime.toISOString(),
                justification: justification,
                status: status,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        });
        
        console.log(`📊 Generated ${todayAttendance.length} attendance records for today`);
        
        // Insert the records
        const { data, error } = await supabase
            .from('attendance_records')
            .insert(todayAttendance)
            .select();
        
        if (error) {
            console.error('❌ Error inserting today\'s attendance:', error);
            return;
        }
        
        console.log(`✅ Successfully inserted ${data.length} attendance records for today`);
        
        // Show summary
        console.log('\n📋 Today\'s attendance summary:');
        const onTimeCount = todayAttendance.filter(record => record.status === 'present').length;
        const lateCount = todayAttendance.filter(record => record.status === 'late').length;
        
        console.log(`✅ On time: ${onTimeCount} employees`);
        console.log(`⚠️ Late: ${lateCount} employees`);
        
        // Show Marcelo's record specifically
        const marceloRecord = todayAttendance.find(record => {
            const employee = employees.find(emp => emp.id === record.employee_id);
            return employee?.name.includes('Marcelo');
        });
        
        if (marceloRecord) {
            const marceloEmployee = employees.find(emp => emp.id === marceloRecord.employee_id);
            const checkInTime = new Date(marceloRecord.check_in).toLocaleTimeString('es-HN', { 
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: 'America/Tegucigalpa'
            });
            const checkOutTime = new Date(marceloRecord.check_out).toLocaleTimeString('es-HN', { 
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: 'America/Tegucigalpa'
            });
            
            console.log(`\n⚠️ Marcelo's attendance:`);
            console.log(`   - Name: ${marceloEmployee?.name}`);
            console.log(`   - Check-in: ${checkInTime} (2 hours late)`);
            console.log(`   - Check-out: ${checkOutTime}`);
            console.log(`   - Status: ${marceloRecord.status}`);
            console.log(`   - Justification: ${marceloRecord.justification || 'None'}`);
        }
        
        // Show some other examples
        console.log('\n📋 Other employees (on time):');
        const onTimeExamples = todayAttendance.filter(record => record.status === 'present').slice(0, 5);
        onTimeExamples.forEach(record => {
            const employee = employees.find(emp => emp.id === record.employee_id);
            const checkInTime = new Date(record.check_in).toLocaleTimeString('es-HN', { 
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: 'America/Tegucigalpa'
            });
            console.log(`  - ${employee?.name}: ${checkInTime} (on time)`);
        });
        
        console.log('\n🎉 Today\'s attendance data generated successfully!');
        
    } catch (error) {
        console.error('💥 Fatal error:', error);
    }
}

// Run the generation
generateTodayAttendance(); 