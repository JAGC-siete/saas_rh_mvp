const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLateMinutes() {
    try {
        console.log('🔍 VERIFICANDO CAMPO late_minutes\n');
        
        // Obtener fecha de hoy
        const tegucigalpaTime = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Tegucigalpa"}));
        const today = tegucigalpaTime.toISOString().split('T')[0];
        
        // Obtener registros de hoy con late_minutes
        const { data: todayAttendance, error } = await supabase
            .from('attendance_records')
            .select('id, employee_id, check_in, check_out, status, late_minutes, date')
            .eq('date', today);
        
        if (error) {
            console.error('❌ Error:', error);
            return;
        }
        
        console.log(`📊 Registros encontrados: ${todayAttendance?.length || 0}`);
        
        if (todayAttendance && todayAttendance.length > 0) {
            console.log('\n📋 VALORES DE late_minutes:');
            todayAttendance.forEach((record, index) => {
                console.log(`${index + 1}. Employee ID: ${record.employee_id}`);
                console.log(`   Check-in: ${record.check_in}`);
                console.log(`   Status: ${record.status}`);
                console.log(`   late_minutes: ${record.late_minutes}`);
                console.log('');
            });
            
            // Analizar valores de late_minutes
            const lateMinutesValues = todayAttendance.map(r => r.late_minutes);
            const uniqueValues = [...new Set(lateMinutesValues)];
            
            console.log('📊 ANÁLISIS DE late_minutes:');
            console.log(`Valores únicos: ${uniqueValues.join(', ')}`);
            console.log(`Registros con late_minutes > 0: ${todayAttendance.filter(r => r.late_minutes > 0).length}`);
            console.log(`Registros con late_minutes = 0: ${todayAttendance.filter(r => r.late_minutes === 0).length}`);
            console.log(`Registros con late_minutes = null: ${todayAttendance.filter(r => r.late_minutes === null).length}`);
            
            // Verificar Marcelo específicamente
            const marceloRecord = todayAttendance.find(r => {
                // Buscar por nombre en employees
                return r.employee_id; // Vamos a verificar después
            });
            
            if (marceloRecord) {
                console.log('\n⚠️ REGISTRO DE MARCELO:');
                console.log(`Employee ID: ${marceloRecord.employee_id}`);
                console.log(`Check-in: ${marceloRecord.check_in}`);
                console.log(`Status: ${marceloRecord.status}`);
                console.log(`late_minutes: ${marceloRecord.late_minutes}`);
            }
            
            // Calcular late_minutes basado en check_in time
            console.log('\n🧮 CÁLCULO MANUAL DE late_minutes:');
            todayAttendance.forEach((record, index) => {
                if (record.check_in) {
                    const checkInTime = new Date(record.check_in);
                    const hour = checkInTime.getHours();
                    const minutes = checkInTime.getMinutes();
                    
                    // Calcular minutos de retraso (después de 8:00 AM)
                    let calculatedLateMinutes = 0;
                    if (hour > 8 || (hour === 8 && minutes > 0)) {
                        calculatedLateMinutes = (hour - 8) * 60 + minutes;
                    }
                    
                    console.log(`${index + 1}. Check-in: ${hour}:${minutes.toString().padStart(2, '0')} - late_minutes calculado: ${calculatedLateMinutes}`);
                }
            });
        }
        
    } catch (error) {
        console.error('💥 Error:', error);
    }
}

checkLateMinutes(); 