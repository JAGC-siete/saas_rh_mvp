import csv
import re
from datetime import datetime

def get_employee_id_mapping(sql_file):
    # Dictionary to store short ID to full ID mapping
    id_mapping = {}
    
    with open(sql_file, 'r') as f:
        content = f.read()
        # Extract all IDs using regex
        matches = re.findall(r"'(\d{4}-\d{4}-\d{5})'", content)
        for full_id in matches:
            # Get last 5 digits as key
            short_id = full_id.split('-')[-1]
            id_mapping[short_id] = full_id
    
    return id_mapping

def transform_attendance(csv_file, id_mapping, output_file):
    with open(output_file, 'w') as out:
        # Write header
        out.write('-- Registros de asistencia transformados desde asistencia.csv\n')
        out.write('INSERT INTO attendance (id_empleado, date, check_in, check_out, justificacion) VALUES\n')
        
        first = True
        with open(csv_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                short_id = row['id_empleado']
                full_id = id_mapping.get(short_id)
                
                if full_id:
                    if not first:
                        out.write(',\n')
                    else:
                        first = False
                    
                    # Format the values
                    values = (
                        full_id,
                        row['fecha'],
                        row['hora_ingreso'],
                        row['hora_salida'],
                        row['justificacion'].replace('"', '') or ''
                    )
                    
                    out.write(f"('{values[0]}', '{values[1]}', '{values[2]}', '{values[3]}', '{values[4]}')")
                else:
                    print(f"Warning: No mapping found for ID: {short_id}")
        
        out.write(';\n')

def main():
    base_dir = '/Users/jorgearturo/saas-proyecto'
    employees_sql = f'{base_dir}/postgres-init/empleados_completos.sql'
    attendance_csv = f'{base_dir}/asistencia.csv'
    output_sql = f'{base_dir}/postgres-init/asistencia_completa_nueva.sql'
    
    print("Creating ID mapping from employees data...")
    id_mapping = get_employee_id_mapping(employees_sql)
    print(f"Found {len(id_mapping)} employee IDs")
    
    print("Transforming attendance data...")
    transform_attendance(attendance_csv, id_mapping, output_sql)
    print("Done! Check the output file:", output_sql)

if __name__ == '__main__':
    main()
