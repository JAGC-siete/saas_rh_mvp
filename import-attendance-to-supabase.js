const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://fwyxmovfrzauebiqxchz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I';
const supabase = createClient(supabaseUrl, supabaseKey);

const data = JSON.parse(fs.readFileSync('attendance_supabase_full.json', 'utf8'));

async function importData() {
  for (let i = 0; i < data.length; i += 500) { // Batches of 500
    const batch = data.slice(i, i + 500);
    const { error } = await supabase
      .from('attendance_records')
      .upsert(batch, { onConflict: ['employee_id', 'date'] });
    if (error) {
      console.error('❌ Error en batch', i, error);
      break;
    } else {
      console.log(`✅ Batch ${i} importado (${batch.length} registros)`);
    }
  }
  console.log('✅ Importación completada');
}

importData(); 