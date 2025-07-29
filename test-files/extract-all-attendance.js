const fs = require('fs');
const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://fwyxmovfrzauebiqxchz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I';
const supabase = createClient(supabaseUrl, supabaseKey);

const INPUT_SQL = 'rh_dump_postgres_ready.sql';
const OUTPUT_JSON = 'attendance_supabase_full.json';

// Solo julio y agosto 2024
const validMonths = ['2024-07', '2024-08'];

// Cache para evitar consultas repetidas
const dniToUUID = {};

async function getEmployeeUUID(dni) {
  if (dniToUUID[dni]) return dniToUUID[dni];
  const { data, error } = await supabase
    .from('employees')
    .select('id')
    .ilike('dni', `%${dni}`)
    .single();
  if (error || !data) return null;
  dniToUUID[dni] = data.id;
  return data.id;
}

function parseInsert(line) {
  // Ejemplo: INSERT INTO control diario de asistencia VALUES(1,'04394','2024-07-01','08:05','17:00','');
  const match = line.match(/VALUES\((\d+),'(\d+)',\s*'([\d-]+)','([\d:]+)','([\d:]+|NULL)','(.*?)'\);/);
  if (!match) return null;
  const [, , dni, fecha, hora_ingreso, hora_salida, justificacion] = match;
  if (!validMonths.some(m => fecha.startsWith(m))) return null;
  if (!hora_ingreso || hora_ingreso === 'NULL' || !hora_salida || hora_salida === 'NULL') return null;
  return { dni, fecha, hora_ingreso, hora_salida, justificacion };
}

async function main() {
  const fileStream = fs.createReadStream(INPUT_SQL);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  const output = [];
  let total = 0;
  let skipped = 0;

  for await (const line of rl) {
    if (!line.startsWith('INSERT INTO control diario de asistencia')) continue;
    const parsed = parseInsert(line);
    if (!parsed) { skipped++; continue; }
    const { dni, fecha, hora_ingreso, hora_salida, justificacion } = parsed;
    const employee_id = await getEmployeeUUID(dni);
    if (!employee_id) {
      skipped++;
      continue;
    }
    output.push({
      employee_id,
      date: fecha,
      check_in: `${fecha}T${hora_ingreso}:00-06:00`,
      check_out: `${fecha}T${hora_salida}:00-06:00`,
      justification: justificacion || '',
      status: 'present'
    });
    total++;
    if (total % 100 === 0) console.log(`Procesados ${total} registros...`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(output, null, 2));
  console.log(`✅ Generados ${output.length} registros en ${OUTPUT_JSON}`);
  console.log(`Registros omitidos (incompletos o sin empleado): ${skipped}`);
}

main(); 