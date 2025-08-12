#!/bin/bash

# SCRIPT DE CONFIGURACION AUTOMATICA PARA CLIENTES HR SaaS
# Genera datos de prueba basados en parámetros de entrada
# Uso: ./auto-setup-client.sh "Nombre Empresa" "Numero Empleados" "Numero Departamentos"

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar parámetros
if [ $# -ne 3 ]; then
    log_error "Uso: $0 \"Nombre Empresa\" \"Numero Empleados\" \"Numero Departamentos\""
    log_error "Ejemplo: $0 \"TechCorp\" 25 5"
    exit 1
fi

COMPANY_NAME="$1"
TOTAL_EMPLOYEES="$2"
NUM_DEPARTMENTS="$3"

# Validar parámetros
if ! [[ "$TOTAL_EMPLOYEES" =~ ^[0-9]+$ ]] || [ "$TOTAL_EMPLOYEES" -lt 1 ]; then
    log_error "El número de empleados debe ser un número positivo"
    exit 1
fi

if ! [[ "$NUM_DEPARTMENTS" =~ ^[0-9]+$ ]] || [ "$NUM_DEPARTMENTS" -lt 1 ]; then
    log_error "El número de departamentos debe ser un número positivo"
    exit 1
fi

if [ "$TOTAL_EMPLOYEES" -lt "$NUM_DEPARTMENTS" ]; then
    log_error "El número de empleados debe ser mayor o igual al número de departamentos"
    exit 1
fi

# Calcular empleados por departamento
EMPLOYEES_PER_DEPT=$((TOTAL_EMPLOYEES / NUM_DEPARTMENTS))
REMAINING_EMPLOYEES=$((TOTAL_EMPLOYEES % NUM_DEPARTMENTS))

log_info "Configurando sistema para: $COMPANY_NAME"
log_info "Total empleados: $TOTAL_EMPLOYEES"
log_info "Departamentos: $NUM_DEPARTMENTS"
log_info "Empleados por departamento: $EMPLOYEES_PER_DEPT"
log_info "Empleados restantes: $REMAINING_EMPLOYEES"

# Crear archivo SQL de configuración
SQL_FILE="setup-client-$(date +%Y%m%d-%H%M%S).sql"
log_info "Generando archivo SQL: $SQL_FILE"

# Generar subdomain basado en el nombre de la empresa
SUBDOMAIN=$(echo "$COMPANY_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -d 'áéíóúñÁÉÍÓÚÑ')

cat > "$SQL_FILE" << EOF
-- =====================================================
-- SCRIPT DE CONFIGURACION AUTOMATICA PARA CLIENTE
-- Empresa: $COMPANY_NAME
-- Empleados: $TOTAL_EMPLOYEES
-- Departamentos: $NUM_DEPARTMENTS
-- Generado: $(date)
-- =====================================================

-- Configuración de la empresa
INSERT INTO companies (id, name, subdomain, plan_type, settings, is_active) VALUES 
(
    gen_random_uuid(),
    '$COMPANY_NAME',
    '$SUBDOMAIN',
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
    dept_counter INTEGER := 1;
    emp_counter INTEGER := 1;
BEGIN
    -- Obtener ID de la empresa
    SELECT id INTO company_id FROM companies WHERE name = '$COMPANY_NAME' LIMIT 1;
    
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
    FOR i IN 1..$NUM_DEPARTMENTS LOOP
        INSERT INTO departments (id, company_id, name, description)
        VALUES (
            gen_random_uuid(),
            company_id,
            CASE 
                WHEN i = 1 THEN 'Recursos Humanos'
                WHEN i = 2 THEN 'Tecnología'
                WHEN i = 3 THEN 'Ventas y Marketing'
                WHEN i = 4 THEN 'Operaciones'
                WHEN i = 5 THEN 'Finanzas'
                WHEN i = 6 THEN 'Servicio al Cliente'
                WHEN i = 7 THEN 'Logística'
                WHEN i = 8 THEN 'Calidad'
                ELSE 'Departamento ' || i
            END,
            CASE 
                WHEN i = 1 THEN 'Gestión de personal y desarrollo organizacional'
                WHEN i = 2 THEN 'Desarrollo de software y soporte técnico'
                WHEN i = 3 THEN 'Estrategias de venta y posicionamiento de marca'
                WHEN i = 4 THEN 'Gestión de procesos y eficiencia operativa'
                WHEN i = 5 THEN 'Contabilidad y gestión financiera'
                WHEN i = 6 THEN 'Atención y satisfacción del cliente'
                WHEN i = 7 THEN 'Gestión de inventarios y distribución'
                WHEN i = 8 THEN 'Control de calidad y mejora continua'
                ELSE 'Descripción del departamento ' || i
            END
        ) RETURNING id INTO dept_id;
        
        RAISE NOTICE 'Departamento % creado con ID: %', i, dept_id;
        
        -- Crear empleados para este departamento
        FOR j IN 1..$EMPLOYEES_PER_DEPT LOOP
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
                LPAD(emp_counter::text, 13, '0'),
                CASE 
                    WHEN j = 1 THEN 'José David'
                    WHEN j = 2 THEN 'María Esther'
                    WHEN j = 3 THEN 'Daniel Samuel'
                    WHEN j = 4 THEN 'Ana Ruth'
                    WHEN j = 5 THEN 'Isaías Miguel'
                    WHEN j = 6 THEN 'Sara Beth'
                    WHEN j = 7 THEN 'Josué Caleb'
                    WHEN j = 8 THEN 'Rebeca Grace'
                    WHEN j = 9 THEN 'Ezequiel Joel'
                    WHEN j = 10 THEN 'Hannah Faith'
                    ELSE 'Empleado ' || emp_counter
                END || ' ' || 
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
                'empleado' || emp_counter || '@$SUBDOMAIN.com',
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
        
        dept_counter := dept_counter + 1;
    END LOOP;
    
    -- Crear empleados restantes en el primer departamento
    IF $REMAINING_EMPLOYEES > 0 THEN
        FOR j IN 1..$REMAINING_EMPLOYEES LOOP
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
                LPAD(emp_counter::text, 13, '0'),
                CASE 
                    WHEN j = 1 THEN 'Gabriel Mateo'
                    WHEN j = 2 THEN 'Sofía Isabel'
                    WHEN j = 3 THEN 'Adrián José'
                    WHEN j = 4 THEN 'Valentina Rose'
                    WHEN j = 5 THEN 'Carlos Andrés'
                    ELSE 'Empleado ' || emp_counter
                END || ' ' || 
                CASE (emp_counter % 4)
                    WHEN 0 THEN 'Morales'
                    WHEN 1 THEN 'Castro'
                    WHEN 2 THEN 'Vargas'
                    WHEN 3 THEN 'Reyes'
                END,
                'empleado' || emp_counter || '@$SUBDOMAIN.com',
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
        
        RAISE NOTICE 'Empleados restantes creados: %', $REMAINING_EMPLOYEES;
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
    
    RAISE NOTICE 'Configuración completada exitosamente para % empleados en % departamentos', $TOTAL_EMPLOYEES, $NUM_DEPARTMENTS;
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
WHERE c.name = '$COMPANY_NAME'
GROUP BY c.id, c.name, c.subdomain;

-- Mostrar departamentos creados
SELECT 
    d.name as departamento,
    COUNT(e.id) as empleados,
    e2.name as gerente
FROM departments d
LEFT JOIN employees e ON e.department_id = d.id
LEFT JOIN employees e2 ON e2.id = d.manager_id
WHERE d.company_id = (SELECT id FROM companies WHERE name = '$COMPANY_NAME')
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
WHERE e.company_id = (SELECT id FROM companies WHERE name = '$COMPANY_NAME')
ORDER BY d.name, e.employee_code;
EOF

log_success "Archivo SQL generado: $SQL_FILE"
log_info "Para aplicar la configuración, ejecuta:"
log_info "psql -h tu-host -U tu-usuario -d tu-base-datos -f $SQL_FILE"
log_info ""
log_info "O si usas Supabase CLI:"
log_info "supabase db reset --db-url tu-url-supabase"
log_info "psql tu-url-supabase -f $SQL_FILE"
log_info ""
log_info "NOTA: Este script crea datos de prueba. Revisa y personaliza antes de usar en producción."
