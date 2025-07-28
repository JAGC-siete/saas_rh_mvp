#!/usr/bin/env python3
"""
Script para convertir datos de employees_paragon a formato SQL de Supabase
Uso: python convert_employees_paragon.py input.csv
"""

import csv
import sys
import json
from datetime import datetime
import re

def clean_text(text):
    """Limpia y normaliza texto"""
    if not text or text.strip() == '':
        return None
    return text.strip().replace("'", "''")  # Escape SQL

def clean_number(text):
    """Convierte texto a número decimal"""
    if not text or text.strip() == '':
        return 0
    try:
        # Remover comas y espacios
        cleaned = re.sub(r'[,\s]', '', str(text))
        return float(cleaned)
    except:
        return 0

def clean_date(date_text):
    """Limpia formato de fecha"""
    if not date_text or date_text.strip() == '':
        return None
    return f"'{date_text.strip()}'"

def generate_sql_insert(employees_data):
    """Genera el INSERT SQL para los empleados"""
    
    sql_values = []
    
    for i, emp in enumerate(employees_data, 1):
        # Preparar valores limpios
        no = i
        code = clean_text(emp.get('Code', f'EMP{i:04d}'))
        name = clean_text(emp.get('Employee Name', ''))
        dni = clean_text(emp.get('DNI', ''))
        salary = clean_number(emp.get('Monthly Salary', 0))
        role = clean_text(emp.get('Role', 'Employee'))
        department = clean_text(emp.get('Department', 'General'))
        hiring_date = clean_text(emp.get('Hiring Date', ''))
        antiguedad = clean_text(emp.get('Antigüedad', ''))
        hiring_date_usa = clean_text(emp.get('Hiring Date USA FORMAT', ''))
        status = clean_text(emp.get('Status', 'Activo'))
        bank = clean_text(emp.get('Bank', ''))
        bank_account = clean_text(emp.get('Bank Account', ''))
        end_contract = clean_text(emp.get('End of Contract', ''))
        motivo_retiro = clean_text(emp.get('Motivo de Retiro', ''))
        notas = clean_text(emp.get('Notas / Observaciones', ''))
        eval_4weeks = clean_text(emp.get('4 week evaluacion', ''))
        eval_2months = clean_text(emp.get('2 months evaluacion', ''))
        eval_8months = clean_text(emp.get('8 MONTHS Evaluacion', ''))
        mail = clean_text(emp.get('mail', ''))
        
        # Skip si no hay nombre
        if not name:
            continue
            
        # Crear valor SQL
        sql_value = f"""    ({no}, '{code or f'EMP{no:04d'}'}', '{name}', '{dni or ''}', {salary}, '{role}', '{department}', '{hiring_date or ''}', '{antiguedad or ''}', '{hiring_date_usa or ''}', '{status}', '{bank or ''}', '{bank_account or ''}', {f"'{end_contract}'" if end_contract else 'null'}, {f"'{motivo_retiro}'" if motivo_retiro else 'null'}, {f"'{notas}'" if notas else 'null'}, {f"'{eval_4weeks}'" if eval_4weeks else 'null'}, {f"'{eval_2months}'" if eval_2months else 'null'}, {f"'{eval_8months}'" if eval_8months else 'null'}, '{mail or ''}')"""
        
        sql_values.append(sql_value)
    
    return ',\n'.join(sql_values)

def main():
    if len(sys.argv) != 2:
        print("Uso: python convert_employees_paragon.py archivo.csv")
        sys.exit(1)
    
    csv_file = sys.argv[1]
    
    try:
        employees = []
        with open(csv_file, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                employees.append(row)
        
        print(f"📊 Procesando {len(employees)} empleados...")
        
        # Generar SQL
        sql_values = generate_sql_insert(employees)
        
        # Plantilla SQL completa
        sql_template = f"""-- DATOS GENERADOS AUTOMÁTICAMENTE PARA employees_paragon
-- Reemplaza la sección "INSERT INTO temp_employees_paragon VALUES" 
-- en el archivo employees_paragon_migration.sql

INSERT INTO temp_employees_paragon VALUES
{sql_values};

-- ✅ Total de empleados a migrar: {len(employees)}
"""
        
        # Guardar archivo
        output_file = 'employees_paragon_data.sql'
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(sql_template)
        
        print(f"✅ Archivo generado: {output_file}")
        print(f"📝 Copia el contenido de este archivo y pégalo en el script de migración")
        print(f"🔄 Luego ejecuta employees_paragon_migration.sql en Supabase SQL Editor")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
