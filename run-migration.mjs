import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

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
    console.log('\n📊 Reading migration file...');
    const migrationSQL = fs.readFileSync('supabase/migrations/20250805000003_enhance_leave_system.sql', 'utf8');
    
    console.log('\n🚀 Running migration...');
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.log('❌ Error running migration:', error.message);
      
      // Try running it in parts
      console.log('\n🔄 Trying to run migration in parts...');
      
      // Split the migration into parts
      const parts = migrationSQL.split(';').filter(part => part.trim().length > 0);
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim() + ';';
        if (part.length > 10) { // Skip empty parts
          console.log(`\n📝 Running part ${i + 1}/${parts.length}...`);
          try {
            const { error: partError } = await supabase.rpc('exec_sql', { sql: part });
            if (partError) {
              console.log(`⚠️  Part ${i + 1} failed:`, partError.message);
            } else {
              console.log(`✅ Part ${i + 1} completed`);
            }
          } catch (e) {
            console.log(`⚠️  Part ${i + 1} error:`, e.message);
          }
        }
      }
    } else {
      console.log('✅ Migration completed successfully!');
    }
    
    console.log('\n📊 Verifying migration results...');
    
    // Check leave_types
    const { data: leaveTypes, error: ltError } = await supabase
      .from('leave_types')
      .select('*')
      .order('name');
    
    if (ltError) {
      console.log('❌ Error checking leave_types:', ltError.message);
    } else {
      console.log('✅ leave_types found:', leaveTypes?.length || 0);
      if (leaveTypes && leaveTypes.length > 0) {
        console.log('Sample leave types:');
        leaveTypes.slice(0, 5).forEach(lt => {
          console.log(`  - ${lt.name} (ID: ${lt.id})`);
        });
      }
    }
    
    // Check leave_requests structure
    const { data: requests, error: reqError } = await supabase
      .from('leave_requests')
      .select('*')
      .limit(1);
    
    if (reqError) {
      console.log('❌ Error checking leave_requests:', reqError.message);
    } else {
      console.log('✅ leave_requests table accessible');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

runMigration();
