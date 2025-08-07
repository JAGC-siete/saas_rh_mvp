const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCompanies() {
    try {
        console.log('🔍 Checking current companies...');
        
        const { data: companies, error } = await supabase
            .from('companies')
            .select('*');
        
        if (error) {
            console.error('❌ Error fetching companies:', error);
            return;
        }
        
        console.log(`📊 Found ${companies.length} companies:`);
        companies.forEach((company, index) => {
            console.log(`${index + 1}. ${company.name} (${company.id})`);
        });
        
    } catch (error) {
        console.error('💥 Fatal error:', error);
    }
}

checkCompanies(); 