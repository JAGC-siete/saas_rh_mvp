const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variables de entorno SUPABASE_URL y SUPABASE_SERVICE_KEY requeridas');
    console.log('Configurar con:');
    console.log('  export SUPABASE_URL="your-url"');
    console.log('  export SUPABASE_SERVICE_KEY="your-key"');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createErreErreCompany() {
    try {
        console.log('🚀 INICIANDO CONFIGURACIÓN DE EMPRESA "ERRE & ERRE"');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Datos de la empresa
        const companyData = {
            name: 'Erre & Erre',
            subdomain: 'erre-erre',
            plan_type: 'premium',
            settings: {
                timezone: 'America/Tegucigalpa',
                currency: 'HNL',
                country: 'Honduras',
                address: 'Tegucigalpa, Francisco Morazán, Honduras',
                phone: '+504 2234-5678',
                email: 'admin@erreerre.com'
            },
            is_active: true
        };
        
        // 1. Verificar/Crear empresa
        console.log('🏢 Verificando empresa...');
        let { data: existingCompany } = await supabase
            .from('companies')
            .select('*')
            .eq('name', 'Erre & Erre')
            .single();
            
        let company, companyId;
        
        if (existingCompany) {
            console.log('✅ Empresa ya existe:', existingCompany.id);
            company = existingCompany;
            companyId = existingCompany.id;
        } else {
            console.log('🏢 Creando nueva empresa...');
            const { data: newCompany, error: companyError } = await supabase
                .from('companies')
                .insert(companyData)
                .select()
                .single();
                
            if (companyError) {
                console.error('❌ Error creando empresa:', companyError);
                return false;
            }
            
            console.log('✅ Empresa creada:', newCompany.id);
            company = newCompany;
            companyId = newCompany.id;
        }
        
        // 2. Verificar/Crear horarios
        console.log('⏰ Verificando horarios...');
        let { data: existingSchedules } = await supabase
            .from('work_schedules')
            .select('*')
            .eq('company_id', companyId);
            
        let schedules;
        
        if (existingSchedules && existingSchedules.length > 0) {
            console.log('✅ Horarios ya existen:', existingSchedules.length);
            schedules = existingSchedules;
        } else {
            console.log('⏰ Creando horarios...');
            const scheduleData = [
                {
                    name: 'Administrativo 8AM-5PM',
                    company_id: companyId,
                    monday_start: '08:00:00',
                    monday_end: '17:00:00',
                    tuesday_start: '08:00:00',
                    tuesday_end: '17:00:00',
                    wednesday_start: '08:00:00',
                    wednesday_end: '17:00:00',
                    thursday_start: '08:00:00',
                    thursday_end: '17:00:00',
                    friday_start: '08:00:00',
                    friday_end: '17:00:00'
                },
                {
                    name: 'Ventas 9AM-6PM',
                    company_id: companyId,
                    monday_start: '09:00:00',
                    monday_end: '18:00:00',
                    tuesday_start: '09:00:00',
                    tuesday_end: '18:00:00',
                    wednesday_start: '09:00:00',
                    wednesday_end: '18:00:00',
                    thursday_start: '09:00:00',
                    thursday_end: '18:00:00',
                    friday_start: '09:00:00',
                    friday_end: '18:00:00',
                    saturday_start: '09:00:00',
                    saturday_end: '13:00:00'
                }
            ];
            
            const { data: newSchedules, error: scheduleError } = await supabase
                .from('work_schedules')
                .insert(scheduleData)
                .select();
                
            if (scheduleError) {
                console.error('❌ Error creando horarios:', scheduleError);
                return false;
            }
            
            console.log('✅ Horarios creados:', newSchedules.length);
            schedules = newSchedules;
        }
        
        // 3. Verificar/Crear departamentos
        console.log('🏬 Verificando departamentos...');
        let { data: existingDepartments } = await supabase
            .from('departments')
            .select('*')
            .eq('company_id', companyId);
            
        let departments;
        
        if (existingDepartments && existingDepartments.length >= 4) {
            console.log('✅ Departamentos ya existen:', existingDepartments.length);
            departments = existingDepartments;
        } else {
            console.log('🏬 Creando departamentos...');
            const deptData = [
                { name: 'Recursos Humanos', description: 'Gestión de personal y desarrollo organizacional', company_id: companyId },
                { name: 'Ventas', description: 'Equipo comercial y atención al cliente', company_id: companyId },
                { name: 'Contabilidad', description: 'Área financiera y control presupuestario', company_id: companyId },
                { name: 'Operaciones', description: 'Producción, logística y operaciones', company_id: companyId }
            ];
            
            const { data: newDepartments, error: deptError } = await supabase
                .from('departments')
                .insert(deptData)
                .select();
                
            if (deptError) {
                console.error('❌ Error creando departamentos:', deptError);
                return false;
            }
            
            console.log('✅ Departamentos creados:', newDepartments.length);
            departments = newDepartments;
        }
        
        // 4. Crear empleados con nombres bíblicos
        console.log('👥 Verificando empleados...');
        let { data: existingEmployees } = await supabase
            .from('employees')
            .select('*')
            .eq('company_id', companyId);
            
        let employees;
        const targetEmployees = 12; // 3 por departamento
        
        if (existingEmployees && existingEmployees.length >= targetEmployees) {
            console.log('✅ Empleados ya existen:', existingEmployees.length);
            employees = existingEmployees;
        } else {
            console.log(`👥 Creando ${targetEmployees} empleados con nombres bíblicos...`);
            
            // Nombres bíblicos
            const maleNames = ['Abraham', 'Isaac', 'Jacob', 'José', 'Moisés', 'David', 'Salomón', 'Daniel', 'Josué', 'Samuel', 'Pedro', 'Pablo', 'Juan', 'Mateo', 'Marcos'];
            const femaleNames = ['María', 'Sara', 'Rebeca', 'Raquel', 'Lea', 'Ruth', 'Ester', 'Débora', 'Miriam', 'Ana', 'Elizabeth', 'Marta', 'Magdalena', 'Susana', 'Joana'];
            const lastNames = ['González', 'Rodríguez', 'Martínez', 'López', 'García', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera'];
            
            let employeeCounter = (existingEmployees?.length || 0) + 1;
            const employeeData = [];
            
            for (const dept of departments) {
                for (let i = 0; i < 3; i++) {
                    // Seleccionar nombre aleatoriamente
                    const isRandom = Math.random() > 0.5;
                    const firstName = isRandom 
                        ? maleNames[Math.floor(Math.random() * maleNames.length)]
                        : femaleNames[Math.floor(Math.random() * femaleNames.length)];
                    const lastName1 = lastNames[Math.floor(Math.random() * lastNames.length)];
                    const lastName2 = lastNames[Math.floor(Math.random() * lastNames.length)];
                    const fullName = `${firstName} ${lastName1} ${lastName2}`;
                    
                    // Generar DNI hondureño realista
                    const year = 1970 + Math.floor(Math.random() * 35);
                    const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
                    const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
                    const sequence = String(10000 + Math.floor(Math.random() * 89999));
                    const dni = `0801${year}${month}${day}${sequence}`;
                    
                    // Determinar horario según departamento
                    const workScheduleId = dept.name === 'Ventas' && schedules.length > 1 ? schedules[1].id : schedules[0].id;
                    
                    employeeData.push({
                        company_id: companyId,
                        employee_code: `EMP${String(employeeCounter).padStart(3, '0')}`,
                        name: fullName,
                        email: `${firstName.toLowerCase()}.${lastName1.toLowerCase()}@erreerre.com`,
                        phone: `+504 ${Math.floor(Math.random() * 9) + 1}${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
                        dni: dni,
                        role: i === 0 ? 'manager' : i === 1 ? 'specialist' : 'assistant',
                        base_salary: i === 0 ? 45000 : i === 1 ? 25000 : 18000,
                        hire_date: new Date().toISOString().split('T')[0],
                        status: 'active',
                        department_id: dept.id,
                        work_schedule_id: workScheduleId,
                        bank_name: 'BAC Honduras',
                        bank_account: String(Math.floor(Math.random() * 900000000 + 100000000))
                    });
                    
                    employeeCounter++;
                }
            }
            
            const { data: newEmployees, error: empError } = await supabase
                .from('employees')
                .insert(employeeData)
                .select();
                
            if (empError) {
                console.error('❌ Error creando empleados:', empError);
                console.error('Detalles:', empError.details);
                return false;
            }
            
            console.log('✅ Empleados creados:', newEmployees.length);
            employees = [...(existingEmployees || []), ...newEmployees];
        }
        
        // 5. Mostrar resumen final
        console.log('\n🎉 ¡EMPRESA "ERRE & ERRE" CONFIGURADA EXITOSAMENTE!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 RESUMEN FINAL:');
        console.log(`  🏢 Empresa: ${company.name}`);
        console.log(`  🆔 Company ID: ${company.id}`);
        console.log(`  🏬 Departamentos: ${departments.length}`);
        console.log(`  ⏰ Horarios: ${schedules.length}`);
        console.log(`  👥 Empleados: ${employees.length}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        console.log('\n📋 DEPARTAMENTOS:');
        departments.forEach(dept => {
            const deptEmployees = employees.filter(emp => emp.department_id === dept.id);
            console.log(`  🏬 ${dept.name}: ${deptEmployees.length} empleados`);
            deptEmployees.forEach(emp => {
                console.log(`    • ${emp.employee_code} - ${emp.name} (${emp.role})`);
            });
        });
        
        console.log('\n🎯 DATOS DE ACCESO:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`  Company ID: ${company.id}`);
        console.log(`  Subdomain: ${company.subdomain}`);
        console.log(`  URL: https://tu-app.railway.app`);
        console.log('  Admin Email: admin@erreerre.com (crear manualmente)');
        
        return {
            success: true,
            company,
            departments,
            schedules,
            employees
        };
        
    } catch (error) {
        console.error('❌ Error fatal:', error);
        return { success: false, error };
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    createErreErreCompany()
        .then((result) => {
            if (result.success) {
                console.log('\n✅ ¡PROCESO COMPLETADO EXITOSAMENTE!');
                process.exit(0);
            } else {
                console.log('\n❌ PROCESO FALLÓ');
                console.error(result.error);
                process.exit(1);
            }
        });
}

module.exports = { createErreErreCompany };
