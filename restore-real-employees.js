const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Supabase configuration
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreRealEmployees() {
    try {
        console.log('🔄 Starting REAL Paragon employees restoration...');
        
        // Read the JSON file with real employees
        const rawData = fs.readFileSync('import-data/employees-final.json', 'utf8');
        const employees = JSON.parse(rawData);
        
        console.log(`📊 Found ${employees.length} REAL employees to restore`);
        
        // First, let's clear the current employees (the test ones)
        console.log('🗑️ Clearing current test employees...');
        const { error: deleteError } = await supabase
            .from('employees')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except a dummy one
        
        if (deleteError) {
            console.error('❌ Error clearing employees:', deleteError);
            return;
        }
        
        console.log('✅ Test employees cleared');
        
        // Transform data to match our schema
        const transformedEmployees = employees.map(emp => ({
            id: emp.id,
            dni: emp.dni,
            name: emp.name,
            role: emp.role,
            base_salary: emp.base_salary,
            bank_name: emp.bank_name,
            bank_account: emp.bank_account,
            status: emp.status,
            company_id: '00000000-0000-0000-0000-000000000001', // Paragon Honduras
            created_at: emp.created_at,
            updated_at: emp.updated_at
        }));
        
        console.log('🔄 Inserting REAL employees...');
        
        // Insert in batches of 50 for better performance
        const batchSize = 50;
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < transformedEmployees.length; i += batchSize) {
            const batch = transformedEmployees.slice(i, i + batchSize);
            
            console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(transformedEmployees.length/batchSize)} (${batch.length} employees)`);
            
            const { data, error } = await supabase
                .from('employees')
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
        
        console.log('\n🎉 REAL EMPLOYEES RESTORATION COMPLETE!');
        console.log(`✅ Successfully restored: ${successCount} employees`);
        console.log(`❌ Failed: ${errorCount} employees`);
        console.log(`📊 Total processed: ${transformedEmployees.length} employees`);
        
        // Show some examples
        console.log('\n📋 Examples of restored employees:');
        const examples = transformedEmployees.slice(0, 5);
        examples.forEach(emp => {
            console.log(`  - ${emp.name} (${emp.dni}) - ${emp.role}`);
        });
        
    } catch (error) {
        console.error('💥 Fatal error:', error);
    }
}

// Run the restoration
restoreRealEmployees(); 