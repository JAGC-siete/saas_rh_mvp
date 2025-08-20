import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for migrations

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase environment variables');
  console.log('Please check your .env.local file');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase with service role...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('\n📊 Step 1: Creating leave_types table if it doesn\'t exist...');
    
    // First, let's try to create the leave_types table
    try {
      const { error: createError } = await supabase
        .from('leave_types')
        .select('id')
        .limit(1);
      
      if (createError && createError.message.includes('does not exist')) {
        console.log('⚠️  leave_types table does not exist, creating it...');
        
        // We'll need to create it manually since we can't run DDL through the client
        console.log('❌ Cannot create table through client. Please run the migration manually in Supabase SQL Editor.');
        return;
      } else {
        console.log('✅ leave_types table exists');
      }
    } catch (e) {
      console.log('⚠️  Error checking table:', e.message);
    }
    
    console.log('\n📊 Step 2: Inserting sample leave types...');
    
    // Insert sample leave types
    const sampleTypes = [
      { name: 'Vacaciones', max_days_per_year: 15, is_paid: true, requires_approval: true, color: '#3498db' },
      { name: 'Enfermedad', max_days_per_year: 10, is_paid: true, requires_approval: true, color: '#e74c3c' },
      { name: 'Personal', max_days_per_year: 5, is_paid: false, requires_approval: true, color: '#f39c12' },
      { name: 'Maternidad', max_days_per_year: 84, is_paid: true, requires_approval: true, color: '#9b59b6' },
      { name: 'Paternidad', max_days_per_year: 10, is_paid: true, requires_approval: true, color: '#1abc9c' },
      { name: 'Emergencia', max_days_per_year: 3, is_paid: false, requires_approval: false, color: '#e67e22' },
      { name: 'Permiso 8 Horas', max_days_per_year: 12, is_paid: false, requires_approval: true, color: '#34495e' },
      { name: 'Permiso 4 Horas', max_days_per_year: 24, is_paid: false, requires_approval: true, color: '#95a5a6' },
      { name: 'Permiso 2 Horas', max_days_per_year: 48, is_paid: false, requires_approval: true, color: '#7f8c8d' }
    ];

    for (const type of sampleTypes) {
      try {
        const { error } = await supabase
          .from('leave_types')
          .insert([type]);
        
        if (error) {
          if (error.message.includes('duplicate key')) {
            console.log(`⚠️  ${type.name} already exists`);
          } else {
            console.log(`❌ Error creating ${type.name}:`, error.message);
          }
        } else {
          console.log(`✅ Created: ${type.name}`);
        }
      } catch (e) {
        console.log(`⚠️  Error with ${type.name}:`, e.message);
      }
    }
    
    console.log('\n📊 Step 3: Checking current leave_types...');
    
    const { data: leaveTypes, error: ltError } = await supabase
      .from('leave_types')
      .select('*')
      .order('name');
    
    if (ltError) {
      console.log('❌ Error fetching leave_types:', ltError.message);
    } else {
      console.log('✅ leave_types found:', leaveTypes?.length || 0);
      if (leaveTypes && leaveTypes.length > 0) {
        console.log('Current leave types:');
        leaveTypes.forEach(lt => {
          console.log(`  - ${lt.name} (ID: ${lt.id})`);
        });
      }
    }
    
    console.log('\n📊 Step 4: Checking leave_requests table...');
    
    const { data: requests, error: reqError } = await supabase
      .from('leave_requests')
      .select('*')
      .limit(1);
    
    if (reqError) {
      console.log('❌ Error fetching leave_requests:', reqError.message);
    } else {
      console.log('✅ leave_requests table accessible');
      if (requests && requests.length > 0) {
        console.log('Sample request:', Object.keys(requests[0]));
      }
    }
    
    console.log('\n📊 Step 5: Checking employees table...');
    
    try {
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, dni')
        .limit(3);
      
      if (empError) {
        console.log('❌ Error fetching employees:', empError.message);
      } else {
        console.log('✅ employees table accessible');
        if (employees && employees.length > 0) {
          console.log('Sample employees with DNI:');
          employees.forEach(emp => {
            console.log(`  - ID: ${emp.id}, DNI: ${emp.dni || 'N/A'}`);
          });
        }
      }
    } catch (e) {
      console.log('⚠️  Error checking employees:', e.message);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

runMigration();
