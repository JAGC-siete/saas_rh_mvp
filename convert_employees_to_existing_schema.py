#!/usr/bin/env python3
"""
Script para convertir datos de empleados de Paragon al esquema existente de Supabase.
Este script lee el archivo employees_202504060814.sql y genera INSERTs compatibles
con el esquema HR existente.
"""

import re
import uuid

def split_name(full_name):
    """Divide un nombre completo en nombre y apellido."""
    if not full_name:
        return "Sin Nombre", "Sin Apellido"
    
    # Limpiar espacios extra
    full_name = " ".join(full_name.split())
    parts = full_name.split()
    
    if len(parts) == 1:
        return parts[0], ""
    elif len(parts) == 2:
        return parts[0], parts[1]
    elif len(parts) == 3:
        return f"{parts[0]} {parts[1]}", parts[2]
    else:
        # Más de 3 partes: primeras como nombre, última como apellido
        return " ".join(parts[:-1]), parts[-1]

def clean_value(value):
    """Limpia y formatea un valor para SQL."""
    if value == 'NULL' or value is None:
        return 'NULL'
    
    # Si es un número, devolverlo sin comillas
    if value.replace('.', '', 1).isdigit():
        return value
    
    # Si es texto, escapar comillas simples y envolver en comillas
    return f"'{value.replace(chr(39), chr(39)+chr(39))}'"

def parse_insert_line(line):
    """Extrae los valores de una línea INSERT."""
    # Buscar el patrón de valores entre paréntesis
    pattern = r"\(([^)]+)\)"
    matches = re.findall(pattern, line)
    
    employees = []
    for match in matches:
        # Usar regex más sofisticado para manejar comillas y comas dentro de strings
        values = []
        current_value = ""
        in_quotes = False
        quote_char = None
        i = 0
        
        while i < len(match):
            char = match[i]
            
            if char in ('"', "'") and not in_quotes:
                in_quotes = True
                quote_char = char
                current_value += char
            elif char == quote_char and in_quotes:
                in_quotes = False
                current_value += char
                quote_char = None
            elif char == ',' and not in_quotes:
                values.append(current_value.strip())
                current_value = ""
            else:
                current_value += char
            
            i += 1
        
        # Agregar el último valor
        if current_value.strip():
            values.append(current_value.strip())
        
        if len(values) >= 11:  # Verificar que tengamos suficientes valores
            # Filtrar solo los registros que tengan UUIDs válidos (empleados reales)
            first_value = values[0].strip().replace("'", "").replace('"', '')
            if len(first_value) > 30 and '-' in first_value:  # Probablemente es un UUID
                employees.append(values)
    
    return employees

def convert_employees_to_new_schema():
    """Convierte el archivo de empleados al nuevo esquema."""
    
    # Leer el archivo original
    input_file = "employees_202504060814.sql"
    
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: No se encontró el archivo {input_file}")
        return
    
    # Extraer todas las líneas que contienen INSERTs
    insert_lines = [line for line in content.split('\n') if 'INSERT INTO' in line or line.strip().startswith('(')]
    
    employees_data = []
    
    for line in insert_lines:
        if 'VALUES' in line or (line.strip().startswith('(') and 'uuid' in line):
            parsed_employees = parse_insert_line(line)
            employees_data.extend(parsed_employees)
    
    print(f"📊 Encontrados {len(employees_data)} empleados para procesar")
    
    # Generar ID único para el horario estándar (será el mismo para todos)
    standard_schedule_id = str(uuid.uuid4())
    
    # Preparar datos para inserción
    employees_inserts = []
    
    for i, emp in enumerate(employees_data):
        try:
            # Mapear los valores originales
            original_id = emp[0].replace("'", "").replace("::uuid", "")
            dni = emp[1].replace("'", "")
            full_name = emp[2].replace("'", "")
            role = emp[3].replace("'", "")
            base_salary = emp[4] if emp[4] != 'NULL' else 'NULL'
            hired_date = emp[7].replace("'", "")
            bank = emp[8].replace("'", "")
            account = emp[9].replace("'", "")
            status = emp[10].replace("'", "")
            
            # Limpiar y separar nombre
            first_name, last_name = split_name(full_name)
            
            # Crear el INSERT para la tabla employees con el esquema existente
            employee_insert = f"""(
    '{original_id}',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '{dni}',                                            -- dni
    '{full_name}',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    '{role}',                                           -- role
    '{role}',                                           -- position (mismo que role)
    {base_salary},                                      -- base_salary
    '{hired_date}',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN '{status}' = 'Activo' THEN 'active' 
         WHEN '{status}' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    '{bank}',                                           -- bank_name
    '{account}',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{{}}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
)"""
            
            employees_inserts.append(employee_insert)
            
        except Exception as e:
            print(f"⚠️  Error procesando empleado {i+1}: {e}")
            continue
    
    # Crear archivo de salida para empleados
    output_content = f"""-- MIGRACIÓN DE EMPLEADOS DE PARAGON AL ESQUEMA EXISTENTE
-- Generado automáticamente desde employees_202504060814.sql
-- Total de empleados: {len(employees_inserts)}

-- 1. Asegurar que existe una empresa
INSERT INTO companies (id, name, subdomain, plan_type, is_active)
VALUES (
    gen_random_uuid(),
    'Paragon Company',
    'paragon',
    'premium',
    true
) ON CONFLICT (subdomain) DO NOTHING;

-- 2. Crear horario estándar
INSERT INTO work_schedules (
    id,
    company_id,
    name,
    monday_start, monday_end,
    tuesday_start, tuesday_end,
    wednesday_start, wednesday_end,
    thursday_start, thursday_end,
    friday_start, friday_end,
    saturday_start, saturday_end,
    sunday_start, sunday_end,
    break_duration,
    timezone
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM companies WHERE subdomain = 'paragon' LIMIT 1),
    'Horario Estándar Paragon',
    '08:00:00', '17:00:00',  -- Lunes
    '08:00:00', '17:00:00',  -- Martes
    '08:00:00', '17:00:00',  -- Miércoles
    '08:00:00', '17:00:00',  -- Jueves
    '08:00:00', '17:00:00',  -- Viernes
    NULL, NULL,              -- Sábado
    NULL, NULL,              -- Domingo
    60,                      -- 1 hora de break
    'America/Tegucigalpa'
) ON CONFLICT DO NOTHING;

-- 3. Insertar empleados
INSERT INTO employees (
    id, company_id, department_id, work_schedule_id, employee_code,
    dni, name, email, phone, role, position, base_salary,
    hire_date, termination_date, status, bank_name, bank_account,
    emergency_contact_name, emergency_contact_phone, address,
    metadata, created_at, updated_at
) VALUES
{','.join(employees_inserts)};

-- 4. Mensaje de confirmación
SELECT 
    COUNT(*) as empleados_insertados,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as activos,
    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactivos
FROM employees 
WHERE company_id = (SELECT id FROM companies WHERE subdomain = 'paragon' LIMIT 1);
"""
    
    # Escribir archivo de salida
    output_file = "paragon_employees_migration.sql"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(output_content)
    
    print(f"✅ Migración completada!")
    print(f"📁 Archivo generado: {output_file}")
    print(f"👥 {len(employees_inserts)} empleados procesados")
    print(f"")
    print(f"🚀 Próximos pasos:")
    print(f"1. Ejecuta migrate_paragon_to_existing_schema.sql en Supabase SQL Editor")
    print(f"2. Luego ejecuta {output_file} en Supabase SQL Editor")
    print(f"3. Verifica que los datos se insertaron correctamente")

if __name__ == "__main__":
    convert_employees_to_new_schema()
