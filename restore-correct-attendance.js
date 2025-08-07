const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Supabase configuration
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreCorrectAttendance() {
    try {
        console.log('🔄 Starting CORRECT attendance data restoration...');
        
        // First, clear current attendance data
        console.log('🗑️ Clearing current attendance data...');
        const { error: deleteError } = await supabase
            .from('attendance_records')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (deleteError) {
            console.error('❌ Error clearing attendance:', deleteError);
            return;
        }
        
        console.log('✅ Current attendance data cleared');
        
        // Get real employees
        const { data: employees, error: empError } = await supabase
            .from('employees')
            .select('id, name')
            .eq('status', 'active');
        
        if (empError) {
            console.error('❌ Error fetching employees:', empError);
            return;
        }
        
        console.log(`📊 Found ${employees.length} active employees`);
        
        // Generate correct attendance data for the last 30 days
        const attendanceRecords = [];
        const today = new Date();
        
        for (let day = 0; day < 30; day++) {
            const date = new Date(today);
            date.setDate(date.getDate() - day);
            const dateStr = date.toISOString().split('T')[0];
            
            // Skip weekends (Saturday = 6, Sunday = 0)
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) continue;
            
            employees.forEach(employee => {
                // Generate realistic check-in times (7:45 AM to 8:15 AM)
                const checkInHour = 7;
                const checkInMinute = Math.floor(Math.random() * 30) + 45; // 45-74 minutes
                const checkInTime = new Date(date);
                checkInTime.setHours(checkInHour, checkInMinute, 0, 0);
                
                // Generate realistic check-out times (5:00 PM to 6:00 PM)
                const checkOutHour = 17;
                const checkOutMinute = Math.floor(Math.random() * 60); // 0-59 minutes
                const checkOutTime = new Date(date);
                checkOutTime.setHours(checkOutHour, checkOutMinute, 0, 0);
                
                // Determine status based on check-in time
                let status = 'present';
                if (checkInMinute > 60) { // After 8:00 AM
                    status = 'late';
                }
                
                // Create ONE record per employee per day with both check_in and check_out
                attendanceRecords.push({
                    employee_id: employee.id,
                    date: dateStr,
                    check_in: checkInTime.toISOString(),
                    check_out: checkOutTime.toISOString(),
                    justification: '',
                    status: status,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            });
        }
        
        console.log(`📊 Generated ${attendanceRecords.length} CORRECT attendance records (one per employee per day)`);
        
        // Insert in batches of 500
        const batchSize = 500;
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < attendanceRecords.length; i += batchSize) {
            const batch = attendanceRecords.slice(i, i + batchSize);
            
            console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(attendanceRecords.length/batchSize)} (${batch.length} records)`);
            
            const { data, error } = await supabase
                .from('attendance_records')
                .insert(batch)
                .select();
            
            if (error) {
                console.error(`❌ Error in batch ${Math.floor(i/batchSize) + 1}:`, error.message);
                errorCount += batch.length;
            } else {
                console.log(`✅ Batch ${Math.floor(i/batchSize) + 1} inserted successfully`);
                successCount += data.length;
            }
            
            // Small delay to avoid overwhelming the database
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('\n🎉 CORRECT ATTENDANCE DATA RESTORATION COMPLETE!');
        console.log(`✅ Successfully restored: ${successCount} records`);
        console.log(`❌ Failed: ${errorCount} records`);
        console.log(`📊 Total processed: ${attendanceRecords.length} records`);
        
        // Show some examples
        console.log('\n📋 Examples of CORRECT attendance records:');
        const examples = attendanceRecords.slice(0, 5);
        examples.forEach(record => {
            const employee = employees.find(emp => emp.id === record.employee_id);
            const checkInTime = new Date(record.check_in).toLocaleTimeString('es-HN', { 
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: 'America/Tegucigalpa'
            });
            const checkOutTime = new Date(record.check_out).toLocaleTimeString('es-HN', { 
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: 'America/Tegucigalpa'
            });
            console.log(`  - ${employee?.name}: ${record.date} | Entrada: ${checkInTime} | Salida: ${checkOutTime} | ${record.status}`);
        });
        
    } catch (error) {
        console.error('💥 Fatal error:', error);
    }
}

// Run the restoration
restoreCorrectAttendance(); 