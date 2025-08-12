#!/usr/bin/env node

/**
 * SCRIPT DE CONFIGURACION AUTOMATICA PARA CLIENTES HR SaaS
 * Genera datos de prueba basados en parámetros de entrada
 * 
 * Uso: node auto-setup-client.js "Nombre Empresa" "Numero Empleados" "Numero Departamentos"
 * Ejemplo: node auto-setup-client.js "TechCorp" 25 5
 */

const fs = require('fs');
const path = require('path');

// Colores para output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

// Función para mostrar mensajes
function log(type, message) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const color = colors[type] || colors.reset;
    console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

// Nombres bíblicos para empleados
const BIBLICAL_NAMES = {
    male: [
        'José David', 'Daniel Samuel', 'Isaías Miguel', 'Josué Caleb', 'Ezequiel Joel',
        'Gabriel Mateo', 'Adrián José', 'Carlos Andrés', 'Miguel Ángel', 'Rafael José',
        'Santiago Pedro', 'Lucas Marcos', 'Juan Pablo', 'Andrés Felipe', 'Tomás Mateo',
        'Bartolomé Simón', 'Judas Tadeo', 'Esteban Felipe', 'Bernabé José', 'Timoteo Pablo'
    ],
    female: [
        'María Esther', 'Ana Ruth', 'Sara Beth', 'Rebeca Grace', 'Hannah Faith',
        'Sofía Isabel', 'Valentina Rose', 'Isabella Grace', 'Camila Hope', 'Victoria Faith',
        'Gabriela Joy', 'Daniela Grace', 'Natalia Faith', 'Adriana Hope', 'Carolina Joy',
        'Patricia Grace', 'Monica Faith', 'Verónica Hope', 'Claudia Joy', 'Silvia Grace'
    ]
};

// Apellidos hondureños comunes
const LAST_NAMES = [
    'González', 'Rodríguez', 'Hernández', 'López', 'Martínez', 'Pérez', 'García', 'Torres',
    'Morales', 'Castro', 'Vargas', 'Reyes', 'Flores', 'Rivera', 'Gómez', 'Díaz',
    'Ramos', 'Vásquez', 'Castillo', 'Herrera', 'Medina', 'Romero', 'Rubio', 'Aguilar',
    'Mendoza', 'Delgado', 'Silva', 'Vega', 'Molina', 'Campos', 'Contreras', 'Navarro'
];

// Departamentos con descripciones
const DEPARTMENTS = [
    { name: 'Recursos Humanos', description: 'Gestión de personal y desarrollo organizacional' },
    { name: 'Tecnología', description: 'Desarrollo de software y soporte técnico' },
    { name: 'Ventas y Marketing', description: 'Estrategias de venta y posicionamiento de marca' },
    { name: 'Operaciones', description: 'Gestión de procesos y eficiencia operativa' },
    { name: 'Finanzas', description: 'Contabilidad y gestión financiera' },
    { name: 'Servicio al Cliente', description: 'Atención y satisfacción del cliente' },
    { name: 'Logística', description: 'Gestión de inventarios y distribución' },
    { name: 'Calidad', description: 'Control de calidad y mejora continua' },
    { name: 'Administración', description: 'Administración general y soporte' },
    { name: 'Compras', description: 'Adquisiciones y gestión de proveedores' }
];

// Posiciones por departamento
const POSITIONS = {
    'Recursos Humanos': ['Gerente de RH', 'Especialista en RH', 'Reclutador', 'Analista de Nómina', 'Coordinador de Capacitación'],
    'Tecnología': ['Gerente de TI', 'Desarrollador Senior', 'Desarrollador Junior', 'Administrador de Sistemas', 'Técnico en Soporte'],
    'Ventas y Marketing': ['Gerente de Ventas', 'Ejecutivo de Ventas Sr', 'Ejecutivo de Ventas Jr', 'Coordinador Comercial', 'Representante de Ventas'],
    'Operaciones': ['Gerente de Operaciones', 'Supervisor de Producción', 'Operario Especializado', 'Operario General', 'Auxiliar de Producción'],
    'Finanzas': ['Gerente Financiero', 'Contador General', 'Contador Jr', 'Auxiliar Contable', 'Analista Financiero'],
    'Servicio al Cliente': ['Gerente de Servicio', 'Supervisor de Atención', 'Representante Sr', 'Representante Jr', 'Auxiliar de Servicio'],
    'Logística': ['Gerente de Logística', 'Supervisor de Almacén', 'Coordinador de Distribución', 'Auxiliar de Almacén', 'Conductor'],
    'Calidad': ['Gerente de Calidad', 'Supervisor de Calidad', 'Inspector de Calidad', 'Analista de Calidad', 'Técnico en Calidad'],
    'Administración': ['Administrador General', 'Asistente Administrativo', 'Recepcionista', 'Secretaria Ejecutiva', 'Auxiliar Administrativo'],
    'Compras': ['Gerente de Compras', 'Analista de Compras', 'Coordinador de Logística', 'Auxiliar de Compras', 'Encargado de Inventarios']
};

// Bancos hondureños
const BANKS = ['Banco Atlántida', 'Banco Ficohsa', 'Banco BAC', 'Banco Azteca', 'Banco Popular'];

// Función para generar DNI hondureño
function generateDNI(counter) {
    const year = 1980 + (counter % 25); // Años entre 1980-2005
    const month = String(1 + (counter % 12)).padStart(2, '0');
    const day = String(1 + (counter % 28)).padStart(2, '0');
    const dept = String(1 + (counter % 18)).padStart(2, '0'); // 18 departamentos en Honduras
    const sequence = String(10000 + (counter % 89999)).padStart(5, '0');
    return `0801${year}${month}${day}${sequence}`;
}

// Función para generar teléfono hondureño
function generatePhone(counter) {
    const prefixes = ['9', '8', '3'];
    const prefix = prefixes[counter % prefixes.length];
    const number = String(100 + (counter % 900)).padStart(3, '0');
    const extension = String(1000 + (counter % 9000)).padStart(4, '0');
    return `+504 ${prefix}${number}-${extension}`;
}

// Función para generar email
function generateEmail(name, companyDomain, counter) {
    const cleanName = name.toLowerCase().replace(/\s+/g, '.').replace(/[áéíóúñ]/g, '');
    return `${cleanName}${counter}@${companyDomain}.com`;
}

// Función para generar salario base
function generateSalary(counter, deptIndex, position) {
    let baseSalary = 15000;
    
    // Ajuste por departamento
    baseSalary += deptIndex * 1000;
    
    // Ajuste por posición
    if (position.includes('Gerente')) baseSalary += 20000;
    else if (position.includes('Supervisor')) baseSalary += 15000;
    else if (position.includes('Senior')) baseSalary += 12000;
    else if (position.includes('Especialista')) baseSalary += 10000;
    else if (position.includes('Analista')) baseSalary += 8000;
    else if (position.includes('Coordinador')) baseSalary += 7000;
    else if (position.includes('Representante')) baseSalary += 5000;
    else if (position.includes('Auxiliar')) baseSalary += 3000;
    
    // Ajuste por antigüedad (counter)
    baseSalary += counter * 500;
    
    return baseSalary;
}

// Función para generar fecha de contratación
function generateHireDate(counter) {
    const baseDate = new Date();
    baseDate.setFullYear(baseDate.getFullYear() - 1);
    baseDate.setDate(baseDate.getDate() + counter);
    return baseDate.toISOString().split('T')[0];
}

// Función para generar nombre completo
function generateFullName(counter, deptIndex) {
    const isMale = counter % 2 === 0;
    const names = isMale ? BIBLICAL_NAMES.male : BIBLICAL_NAMES.female;
    const nameIndex = counter % names.length;
    const lastNameIndex = (deptIndex + counter) % LAST_NAMES.length;
    
    return `${names[nameIndex]} ${LAST_NAMES[lastNameIndex]}`;
}

// Función principal
function main() {
    // Verificar parámetros
    if (process.argv.length !== 5) {
        log('red', 'Error: Uso incorrecto');
        log('yellow', 'Uso: node auto-setup-client.js "Nombre Empresa" "Numero Empleados" "Numero Departamentos"');
        log('yellow', 'Ejemplo: node auto-setup-client.js "TechCorp" 25 5');
        process.exit(1);
    }

    const companyName = process.argv[2];
    const totalEmployees = parseInt(process.argv[3]);
    const numDepartments = parseInt(process.argv[4]);

    // Validar parámetros
    if (isNaN(totalEmployees) || totalEmployees < 1) {
        log('red', 'Error: El número de empleados debe ser un número positivo');
        process.exit(1);
    }

    if (isNaN(numDepartments) || numDepartments < 1) {
        log('red', 'Error: El número de departamentos debe ser un número positivo');
        process.exit(1);
    }

    if (totalEmployees < numDepartments) {
        log('red', 'Error: El número de empleados debe ser mayor o igual al número de departamentos');
        process.exit(1);
    }

    if (numDepartments > DEPARTMENTS.length) {
        log('yellow', `Advertencia: Solo hay ${DEPARTMENTS.length} departamentos predefinidos. Se usarán nombres genéricos para los adicionales.`);
    }

    // Calcular empleados por departamento
    const employeesPerDept = Math.floor(totalEmployees / numDepartments);
    const remainingEmployees = totalEmployees % numDepartments;
    let emp_counter = 1; // Contador para empleados

    log('blue', `Configurando sistema para: ${companyName}`);
    log('blue', `Total empleados: ${totalEmployees}`);
    log('blue', `Departamentos: ${numDepartments}`);
    log('blue', `Empleados por departamento: ${employeesPerDept}`);
    log('blue', `Empleados restantes: ${remainingEmployees}`);

    // Generar subdomain basado en el nombre de la empresa
    const subdomain = companyName.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[áéíóúñÁÉÍÓÚÑ]/g, '')
        .replace(/[^a-z0-9-]/g, '');

    // Crear archivo SQL
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const sqlFileName = `setup-client-${companyName.replace(/\s+/g, '-')}-${timestamp}.sql`;
    
    log('blue', `Generando archivo SQL: ${sqlFileName}`);

    let sqlContent = generateSQL(companyName, subdomain, totalEmployees, numDepartments, employeesPerDept, remainingEmployees, emp_counter);

    // Escribir archivo
    try {
        fs.writeFileSync(sqlFileName, sqlContent, 'utf8');
        log('green', `Archivo SQL generado exitosamente: ${sqlFileName}`);
        
        // Mostrar instrucciones
        log('blue', '\nPara aplicar la configuración, ejecuta:');
        log('yellow', `psql -h tu-host -U tu-usuario -d tu-base-datos -f ${sqlFileName}`);
        log('blue', '\nO si usas Supabase CLI:');
        log('yellow', 'supabase db reset --db-url tu-url-supabase');
        log('yellow', `psql tu-url-supabase -f ${sqlFileName}`);
        log('blue', '\nNOTA: Este script crea datos de prueba. Revisa y personaliza antes de usar en producción.');
        
    } catch (error) {
        log('red', `Error al escribir el archivo: ${error.message}`);
        process.exit(1);
    }
}

// Función para generar el contenido SQL
function generateSQL(companyName, subdomain, totalEmployees, numDepartments, employeesPerDept, remainingEmployees, emp_counter) {
    let sql = `-- =====================================================
-- SCRIPT DE CONFIGURACION AUTOMATICA PARA CLIENTE
-- Empresa: ${companyName}
-- Empleados: ${totalEmployees}
-- Departamentos: ${numDepartments}
-- Generado: ${new Date().toISOString()}
-- =====================================================

-- Configuración de la empresa
INSERT INTO companies (id, name, subdomain, plan_type, settings, is_active) VALUES 
(
    gen_random_uuid(),
    '${companyName}',
    '${subdomain}',
    'premium',
    '{"timezone": "America/Tegucigalpa", "currency": "HNL", "country": "Honduras"}',
    true
);

-- Obtener ID de la empresa creada
DO \$\$
DECLARE
    company_id UUID;
    dept_id UUID;
    schedule_id UUID;
    emp_id UUID;
    i INTEGER;
    j INTEGER;
    emp_counter INTEGER := 1;
BEGIN
    -- Obtener ID de la empresa
    SELECT id INTO company_id FROM companies WHERE name = '${companyName}' LIMIT 1;
    
    IF company_id IS NULL THEN
        RAISE EXCEPTION 'No se pudo crear la empresa';
    END IF;
    
    RAISE NOTICE 'Empresa creada con ID: %', company_id;
    
    -- Crear horario de trabajo estándar
    INSERT INTO work_schedules (id, company_id, name, monday_start, monday_end, tuesday_start, tuesday_end, 
                               wednesday_start, wednesday_end, thursday_start, thursday_end, friday_start, friday_end,
                               break_duration, timezone)
    VALUES (
        gen_random_uuid(),
        company_id,
        'Horario Estándar 8-5',
        '08:00:00', '17:00:00',
        '08:00:00', '17:00:00',
        '08:00:00', '17:00:00',
        '08:00:00', '17:00:00',
        '08:00:00', '17:00:00',
        60,
        'America/Tegucigalpa'
    ) RETURNING id INTO schedule_id;
    
    RAISE NOTICE 'Horario de trabajo creado con ID: %', schedule_id;
    
    -- Crear departamentos
    FOR i IN 1..${numDepartments} LOOP
        INSERT INTO departments (id, company_id, name, description)
        VALUES (
            gen_random_uuid(),
            company_id,
            CASE 
                WHEN i = 1 THEN '${DEPARTMENTS[0]?.name || 'Recursos Humanos'}'
                WHEN i = 2 THEN '${DEPARTMENTS[1]?.name || 'Tecnología'}'
                WHEN i = 3 THEN '${DEPARTMENTS[2]?.name || 'Ventas y Marketing'}'
                WHEN i = 4 THEN '${DEPARTMENTS[3]?.name || 'Operaciones'}'
                WHEN i = 5 THEN '${DEPARTMENTS[4]?.name || 'Finanzas'}'
                WHEN i = 6 THEN '${DEPARTMENTS[5]?.name || 'Servicio al Cliente'}'
                WHEN i = 7 THEN '${DEPARTMENTS[6]?.name || 'Logística'}'
                WHEN i = 8 THEN '${DEPARTMENTS[7]?.name || 'Calidad'}'
                WHEN i = 9 THEN '${DEPARTMENTS[8]?.name || 'Administración'}'
                WHEN i = 10 THEN '${DEPARTMENTS[9]?.name || 'Compras'}'
                ELSE 'Departamento ' || i
            END,
            CASE 
                WHEN i = 1 THEN '${DEPARTMENTS[0]?.description || 'Gestión de personal y desarrollo organizacional'}'
                WHEN i = 2 THEN '${DEPARTMENTS[1]?.description || 'Desarrollo de software y soporte técnico'}'
                WHEN i = 3 THEN '${DEPARTMENTS[2]?.description || 'Estrategias de venta y posicionamiento de marca'}'
                WHEN i = 4 THEN '${DEPARTMENTS[3]?.description || 'Gestión de procesos y eficiencia operativa'}'
                WHEN i = 5 THEN '${DEPARTMENTS[4]?.description || 'Contabilidad y gestión financiera'}'
                WHEN i = 6 THEN '${DEPARTMENTS[5]?.description || 'Atención y satisfacción del cliente'}'
                WHEN i = 7 THEN '${DEPARTMENTS[6]?.description || 'Gestión de inventarios y distribución'}'
                WHEN i = 8 THEN '${DEPARTMENTS[7]?.description || 'Control de calidad y mejora continua'}'
                WHEN i = 9 THEN '${DEPARTMENTS[8]?.description || 'Administración general y soporte'}'
                WHEN i = 10 THEN '${DEPARTMENTS[9]?.description || 'Adquisiciones y gestión de proveedores'}'
                ELSE 'Descripción del departamento ' || i
            END
        ) RETURNING id INTO dept_id;
        
        RAISE NOTICE 'Departamento % creado con ID: %', i, dept_id;
        
        -- Crear empleados para este departamento
        FOR j IN 1..${employeesPerDept} LOOP
            -- Crear empleado
            INSERT INTO employees (
                id, company_id, department_id, work_schedule_id, employee_code, dni, name, 
                email, phone, role, position, base_salary, hire_date, status,
                bank_name, bank_account, emergency_contact_name, emergency_contact_phone
            )
            VALUES (
                gen_random_uuid(),
                company_id,
                dept_id,
                schedule_id,
                'EMP' || LPAD(emp_counter::text, 3, '0'),
                'EMP' || LPAD(emp_counter::text, 13, '0'),
                'Empleado ' || emp_counter || ' ' || 
                CASE 
                    WHEN i = 1 THEN 'González'
                    WHEN i = 2 THEN 'Rodríguez'
                    WHEN i = 3 THEN 'Hernández'
                    WHEN i = 4 THEN 'López'
                    WHEN i = 5 THEN 'Martínez'
                    WHEN i = 6 THEN 'Pérez'
                    WHEN i = 7 THEN 'García'
                    WHEN i = 8 THEN 'Torres'
                    ELSE 'Apellido' || i
                END,
                'empleado' || emp_counter || '@${subdomain}.com',
                '+504 9' || LPAD((emp_counter % 9999)::text, 4, '0'),
                CASE 
                    WHEN j = 1 THEN 'Gerente'
                    WHEN j = 2 THEN 'Supervisor'
                    WHEN j = 3 THEN 'Especialista'
                    WHEN j = 4 THEN 'Asistente'
                    WHEN j = 5 THEN 'Analista'
                    ELSE 'Empleado'
                END,
                CASE 
                    WHEN i = 1 AND j = 1 THEN 'Gerente de RH'
                    WHEN i = 2 AND j = 1 THEN 'Gerente de TI'
                    WHEN i = 3 AND j = 1 THEN 'Gerente de Ventas'
                    WHEN i = 4 AND j = 1 THEN 'Gerente de Operaciones'
                    WHEN i = 5 AND j = 1 THEN 'Gerente Financiero'
                    WHEN i = 6 AND j = 1 THEN 'Gerente de Servicio'
                    WHEN i = 7 AND j = 1 THEN 'Gerente de Logística'
                    WHEN i = 8 AND j = 1 THEN 'Gerente de Calidad'
                    WHEN i = 9 AND j = 1 THEN 'Gerente de Administración'
                    WHEN i = 10 AND j = 1 THEN 'Gerente de Compras'
                    WHEN j = 1 THEN 'Gerente de Departamento'
                    WHEN j = 2 THEN 'Supervisor'
                    WHEN j = 3 THEN 'Especialista'
                    WHEN j = 4 THEN 'Asistente'
                    WHEN j = 5 THEN 'Analista'
                    ELSE 'Empleado'
                END,
                (15000 + (emp_counter * 500) + (i * 1000))::DECIMAL(10,2),
                (CURRENT_DATE - INTERVAL '1 year' + (emp_counter * INTERVAL '1 day'))::DATE,
                'active',
                CASE (emp_counter % 4)
                    WHEN 0 THEN 'Banco Atlántida'
                    WHEN 1 THEN 'Banco Ficohsa'
                    WHEN 2 THEN 'Banco BAC'
                    WHEN 3 THEN 'Banco Azteca'
                END,
                LPAD(emp_counter::text, 10, '0'),
                CASE 
                    WHEN j = 1 THEN 'Contacto de Emergencia'
                    ELSE 'Familiar ' || emp_counter
                END,
                '+504 8' || LPAD((emp_counter % 9999)::text, 4, '0')
            ) RETURNING id INTO emp_id;
            
            RAISE NOTICE 'Empleado % del departamento % creado con ID: %', j, i, emp_id;
            emp_counter := emp_counter + 1;
        END LOOP;
        
        -- Asignar el primer empleado como manager del departamento
        UPDATE departments 
        SET manager_id = (
            SELECT id FROM employees 
            WHERE company_id = company_id AND department_id = dept_id 
            ORDER BY employee_code LIMIT 1
        )
        WHERE id = dept_id;
    END LOOP;
    
    -- Crear empleados restantes en el primer departamento
    IF ${remainingEmployees} > 0 THEN
        FOR j IN 1..${remainingEmployees} LOOP
            INSERT INTO employees (
                id, company_id, department_id, work_schedule_id, employee_code, dni, name, 
                email, phone, role, position, base_salary, hire_date, status,
                bank_name, bank_account, emergency_contact_name, emergency_contact_phone
            )
            VALUES (
                gen_random_uuid(),
                company_id,
                (SELECT id FROM departments WHERE company_id = company_id ORDER BY name LIMIT 1),
                schedule_id,
                'EMP' || LPAD(emp_counter::text, 3, '0'),
                'EMP' || LPAD(emp_counter::text, 13, '0'),
                'Empleado ' || emp_counter || ' ' || 
                CASE (emp_counter % 4)
                    WHEN 0 THEN 'Morales'
                    WHEN 1 THEN 'Castro'
                    WHEN 2 THEN 'Vargas'
                    WHEN 3 THEN 'Reyes'
                END,
                'empleado' || emp_counter || '@${subdomain}.com',
                '+504 9' || LPAD((emp_counter % 9999)::text, 4, '0'),
                'Empleado',
                'Asistente',
                (15000 + (emp_counter * 500))::DECIMAL(10,2),
                (CURRENT_DATE - INTERVAL '6 months' + (emp_counter * INTERVAL '1 day'))::DATE,
                'active',
                CASE (emp_counter % 4)
                    WHEN 0 THEN 'Banco Atlántida'
                    WHEN 1 THEN 'Banco Ficohsa'
                    WHEN 2 THEN 'Banco BAC'
                    WHEN 3 THEN 'Banco Azteca'
                END,
                LPAD(emp_counter::text, 10, '0'),
                'Familiar ' || emp_counter,
                '+504 8' || LPAD((emp_counter % 9999)::text, 4, '0')
            );
            
            emp_counter := emp_counter + 1;
        END LOOP;
        
        RAISE NOTICE 'Empleados restantes creados: %', ${remainingEmployees};
    END IF;
    
    -- Crear tipos de permisos
    INSERT INTO leave_types (id, company_id, name, max_days_per_year, is_paid, requires_approval, color) VALUES
        (gen_random_uuid(), company_id, 'Vacaciones', 15, true, true, '#3498db'),
        (gen_random_uuid(), company_id, 'Enfermedad', 10, true, true, '#e74c3c'),
        (gen_random_uuid(), company_id, 'Personal', 5, false, true, '#f39c12'),
        (gen_random_uuid(), company_id, 'Maternidad', 90, true, false, '#9b59b6'),
        (gen_random_uuid(), company_id, 'Paternidad', 10, true, false, '#1abc9c');
    
    RAISE NOTICE 'Tipos de permisos creados';
    
    -- Crear logros para gamificación
    INSERT INTO achievement_types (name, description, icon, points_reward, badge_color, requirements) VALUES
        ('Puntualidad Perfecta', 'Llegar a tiempo todos los días de la semana', 'clock', 100, 'gold', '{"consecutive_days": 5}'),
        ('Primero en Llegar', 'Ser el primer empleado en llegar al trabajo', 'star', 50, 'silver', '{"early_arrival": true}'),
        ('Semana Perfecta', 'Completar una semana sin ausencias', 'trophy', 200, 'bronze', '{"perfect_week": true}'),
        ('Meses de Servicio', 'Completar 6 meses en la empresa', 'medal', 500, 'blue', '{"months_service": 6}'),
        ('Colaborador del Mes', 'Ser reconocido como el mejor colaborador', 'crown', 1000, 'purple', '{"recognition": "monthly"}');
    
    RAISE NOTICE 'Sistema de gamificación configurado';
    
    RAISE NOTICE 'Configuración completada exitosamente para % empleados en % departamentos', ${totalEmployees}, ${numDepartments};
END \$\$;

-- Verificar la configuración
SELECT 
    c.name as empresa,
    c.subdomain,
    COUNT(DISTINCT d.id) as total_departamentos,
    COUNT(DISTINCT e.id) as total_empleados,
    COUNT(DISTINCT ws.id) as total_horarios
FROM companies c
LEFT JOIN departments d ON d.company_id = c.id
LEFT JOIN employees e ON e.company_id = c.id
LEFT JOIN work_schedules ws ON ws.company_id = c.id
WHERE c.name = '${companyName}'
GROUP BY c.id, c.name, c.subdomain;

-- Mostrar departamentos creados
SELECT 
    d.name as departamento,
    COUNT(e.id) as empleados,
    e2.name as gerente
FROM departments d
LEFT JOIN employees e ON e.department_id = d.id
LEFT JOIN employees e2 ON e2.id = d.manager_id
WHERE d.company_id = (SELECT id FROM companies WHERE name = '${companyName}')
GROUP BY d.id, d.name, e2.name
ORDER BY d.name;

-- Mostrar empleados por departamento
SELECT 
    d.name as departamento,
    e.employee_code,
    e.name as empleado,
    e.position as puesto,
    e.base_salary as salario_base
FROM employees e
JOIN departments d ON d.id = e.department_id
WHERE e.company_id = (SELECT id FROM companies WHERE name = '${companyName}')
ORDER BY d.name, e.employee_code;
`;

    return sql;
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main();
}

module.exports = { main, generateSQL };
