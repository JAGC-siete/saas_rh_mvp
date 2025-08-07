const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixLateMinutes() {
    try {
        console.log('🔧 CORRIGIENDO CAMPO late_minutes\n');
        
        // Obtener fecha de hoy
        const tegucigalpaTime = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Tegucigalpa"}));
        const today = tegucigalpaTime.toISOString().split('T')[0];
        
        // Obtener registros de hoy
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
            let updatedCount = 0;
            
            for (const record of todayAttendance) {
                if (record.check_in) {
                    const checkInTime = new Date(record.check_in);
                    const hour = checkInTime.getHours();
                    const minutes = checkInTime.getMinutes();
                    
                    // Calcular minutos de retraso (después de 8:00 AM)
                    let calculatedLateMinutes = 0;
                    if (hour > 8 || (hour === 8 && minutes > 0)) {
                        calculatedLateMinutes = (hour - 8) * 60 + minutes;
                    }
                    
                    // Solo actualizar si el valor es diferente
                    if (calculatedLateMinutes !== record.late_minutes) {
                        console.log(`🔄 Actualizando registro ${record.id}:`);
                        console.log(`   Check-in: ${hour}:${minutes.toString().padStart(2, '0')}`);
                        console.log(`   late_minutes actual: ${record.late_minutes} → nuevo: ${calculatedLateMinutes}`);
                        
                        const { error: updateError } = await supabase
                            .from('attendance_records')
                            .update({ late_minutes: calculatedLateMinutes })
                            .eq('id', record.id);
                        
                        if (updateError) {
                            console.error(`❌ Error actualizando registro ${record.id}:`, updateError);
                        } else {
                            console.log(`✅ Registro ${record.id} actualizado correctamente`);
                            updatedCount++;
                        }
                        
                        console.log('');
                    }
                }
            }
            
            console.log(`🎉 Actualización completada: ${updatedCount} registros actualizados`);
            
            // Verificar el resultado
            console.log('\n📋 VERIFICACIÓN FINAL:');
            const { data: finalCheck, error: finalError } = await supabase
                .from('attendance_records')
                .select('id, employee_id, check_in, status, late_minutes')
                .eq('date', today)
                .gt('late_minutes', 0);
            
            if (finalError) {
                console.error('❌ Error en verificación final:', finalError);
            } else {
                console.log(`✅ Registros con late_minutes > 0: ${finalCheck?.length || 0}`);
                
                if (finalCheck && finalCheck.length > 0) {
                    console.log('\n📋 Registros tardíos:');
                    finalCheck.forEach(record => {
                        const checkInTime = new Date(record.check_in);
                        const hour = checkInTime.getHours();
                        const minutes = checkInTime.getMinutes();
                        console.log(`   - Employee ID: ${record.employee_id}`);
                        console.log(`     Check-in: ${hour}:${minutes.toString().padStart(2, '0')}`);
                        console.log(`     late_minutes: ${record.late_minutes}`);
                        console.log(`     Status: ${record.status}`);
                        console.log('');
                    });
                }
            }
        }
        
    } catch (error) {
        console.error('💥 Error:', error);
    }
}

fixLateMinutes(); 