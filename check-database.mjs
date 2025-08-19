import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase environment variables');
  console.log('Please check your .env.local file');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  try {
    console.log('\n📊 Checking leave_types table...');
    const { data: leaveTypes, error: ltError } = await supabase
      .from('leave_types')
      .select('*')
      .order('name');
    
    if (ltError) {
      console.log('❌ Error fetching leave_types:', ltError.message);
    } else {
      console.log('✅ leave_types found:', leaveTypes?.length || 0);
      if (leaveTypes && leaveTypes.length > 0) {
        console.log('Sample leave types:');
        leaveTypes.slice(0, 5).forEach(lt => {
          console.log(`  - ${lt.name} (ID: ${lt.id})`);
        });
      } else {
        console.log('⚠️  No leave types found. Creating sample data...');
        
        // Create sample leave types
        const sampleTypes = [
          { name: 'Vacaciones', max_days_per_year: 15, is_paid: true, requires_approval: true, color: '#3498db' },
          { name: 'Enfermedad', max_days_per_year: 10, is_paid: true, requires_approval: true, color: '#e74c3c' },
          { name: 'Personal', max_days_per_year: 5, is_paid: false, requires_approval: true, color: '#f39c12' },
          { name: 'Maternidad', max_days_per_year: 84, is_paid: true, requires_approval: true, color: '#9b59b6' },
          { name: 'Paternidad', max_days_per_year: 10, is_paid: true, requires_approval: true, color: '#1abc9c' },
          { name: 'Emergencia', max_days_per_year: 3, is_paid: false, requires_approval: false, color: '#e67e22' },
          { name: 'Permiso 8 Horas', max_days_per_year: 12, is_paid: false, requires_approval: true, color: '#34495e' }
        ];

        for (const type of sampleTypes) {
          const { error } = await supabase
            .from('leave_types')
            .insert([type]);
          
          if (error) {
            console.log(`❌ Error creating ${type.name}:`, error.message);
          } else {
            console.log(`✅ Created: ${type.name}`);
          }
        }
      }
    }

    console.log('\n📊 Checking leave_requests table structure...');
    const { data: requests, error: reqError } = await supabase
      .from('leave_requests')
      .select('*')
      .limit(1);
    
    if (reqError) {
      console.log('❌ Error fetching leave_requests:', reqError.message);
    } else {
      console.log('✅ leave_requests table accessible');
    }

    console.log('\n📊 Checking employees table for DNI...');
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, dni')
      .limit(3);
    
    if (empError) {
      console.log('❌ Error fetching employees:', empError.message);
    } else {
      console.log('✅ employees table accessible');
      if (employees && employees.length > 0) {
        console.log('Sample employees:');
        employees.forEach(emp => {
          console.log(`  - ${emp.first_name} ${emp.last_name} (DNI: ${emp.dni || 'N/A'})`);
        });
      }
    }

    console.log('\n📊 Checking if we need to add duration fields...');
    // Check if we need to add duration fields to leave_requests
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'leave_requests')
      .eq('table_schema', 'public');
    
    if (tableError) {
      console.log('❌ Error checking table structure:', tableError.message);
    } else {
      const columns = tableInfo?.map(col => col.column_name) || [];
      console.log('Current columns:', columns);
      
      if (!columns.includes('duration_hours') && !columns.includes('duration_type')) {
        console.log('⚠️  Need to add duration fields to leave_requests table');
      }
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

checkDatabase();
