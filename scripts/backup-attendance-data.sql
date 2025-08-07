-- BACKUP DE DATOS CRÍTICOS DE ASISTENCIA
-- Ejecutar ANTES de cualquier modificación

-- Backup de attendance_records del 4 al 7 de agosto
CREATE TABLE IF NOT EXISTS attendance_records_backup_20250807 AS
SELECT * FROM attendance_records 
WHERE date BETWEEN '2025-08-04' AND '2025-08-07';

-- Backup de work_schedules
CREATE TABLE IF NOT EXISTS work_schedules_backup_20250807 AS
SELECT * FROM work_schedules;

-- Backup de employees activos
CREATE TABLE IF NOT EXISTS employees_backup_20250807 AS
SELECT * FROM employees WHERE status = 'active';

-- Verificar que los backups se crearon correctamente
SELECT 
  'attendance_records_backup_20250807' as table_name,
  COUNT(*) as record_count
FROM attendance_records_backup_20250807
UNION ALL
SELECT 
  'work_schedules_backup_20250807' as table_name,
  COUNT(*) as record_count
FROM work_schedules_backup_20250807
UNION ALL
SELECT 
  'employees_backup_20250807' as table_name,
  COUNT(*) as record_count
FROM employees_backup_20250807; 