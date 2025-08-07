const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmployeeIds() {
    try {
        console.log('🔍 Checking current employee IDs...');
        
        const { data: employees, error } = await supabase
            .from('employees')
            .select('id, name, dni')
            .order('name');
        
        if (error) {
            console.error('❌ Error fetching employees:', error);
            return;
        }
        
        console.log(`📊 Found ${employees.length} employees:`);
        console.log('\nEmployee IDs:');
        employees.forEach((emp, index) => {
            console.log(`${index + 1}. ${emp.name} (${emp.dni}) -> ${emp.id}`);
        });
        
        // Show first 5 and last 5 for reference
        console.log('\n📋 First 5 employee IDs:');
        employees.slice(0, 5).forEach(emp => {
            console.log(`  ${emp.id}`);
        });
        
        console.log('\n📋 Last 5 employee IDs:');
        employees.slice(-5).forEach(emp => {
            console.log(`  ${emp.id}`);
        });
        
    } catch (error) {
        console.error('💥 Fatal error:', error);
    }
}

checkEmployeeIds(); 