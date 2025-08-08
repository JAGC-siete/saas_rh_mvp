# 📊 Guía Completa de Migración de Empleados

## 🎯 Resumen

Esta guía describe el proceso completo para migrar los datos de empleados desde el archivo `employees_202504060814.sql` a la estructura de Supabase, resolviendo todos los conflictos identificados en el análisis.

## 🔍 Conflictos Identificados y Soluciones

### ❌ **Conflictos Críticos Resueltos**

| Problema | Solución Implementada |
|----------|----------------------|
| `company_id` requerido faltante | ✅ Creación automática de compañía principal |
| `base_salary` con valores NULL | ✅ Aplicación de salario por defecto (15,000) |
| Nombres de campos diferentes | ✅ Mapeo automático de campos |
| Horarios en tabla empleados | ✅ Migración a `work_schedules` |

### 🔧 **Transformaciones de Datos**

| Campo Original | Campo Supabase | Transformación |
|----------------|----------------|----------------|
| `hired_date` (TEXT) | `hire_date` (DATE) | Conversión de tipo |
| `bank` | `bank_name` | Normalización de nombres |
| `account` | `bank_account` | Mapeo directo |
| `checkin_time/checkout_time` | `work_schedules` | Migración a tabla separada |
| DNI con espacios | DNI con guiones | Normalización de formato |

## 📁 Archivos Creados

### 1. **`migration_employee_data.sql`** - Script Principal
- ✅ Crea entidades de soporte (company, departments, work_schedules)
- ✅ Implementa funciones de limpieza de datos
- ✅ Migra todos los empleados con transformaciones
- ✅ Maneja valores NULL y formatos inconsistentes
- ✅ Genera reportes de migración

### 2. **`validation_employee_migration.sql`** - Validaciones
- ✅ Verifica integridad de datos migrados
- ✅ Reportes de calidad de datos
- ✅ Identificación de empleados que requieren revisión
- ✅ Tests de funcionalidad del sistema

### 3. **`run_employee_migration.sh`** - Script de Ejecución
- ✅ Ejecutión paso a paso con validaciones
- ✅ Backup automático de datos existentes
- ✅ Verificación de prerrequisitos
- ✅ Rollback en caso de errores

## 🚀 Proceso de Ejecución

### Prerrequisitos

1. **Supabase configurado** con migraciones aplicadas
2. **Base de datos accesible** via URL de conexión
3. **Archivos de migración** en el directorio del proyecto

### Ejecución Automática

```bash
# Ejecutar migración completa
./run_employee_migration.sh
```

### Ejecución Manual

```bash
# 1. Ejecutar migración principal
psql $SUPABASE_DB_URL -f migration_employee_data.sql

# 2. Ejecutar validaciones
psql $SUPABASE_DB_URL -f validation_employee_migration.sql
```

## 📊 Estructura de Datos Migrados

### **Entidades de Soporte Creadas**

#### Company Principal
```sql
id: '00000000-0000-0000-0000-000000000001'
name: 'Empresa Principal'
subdomain: 'main'
plan_type: 'enterprise'
```

#### Departamentos por Rol
- **Procesamiento de Datos**: Procesador de Datos, Actualización de Datos
- **Verificación de Datos**: Verificación Español/Inglés
- **Contact Center**: Agentes de contact center
- **Negociación**: Roles de negociación y ventas
- **Gerencia**: Gerentes y managers
- **Recursos Humanos**: Jefe de Personal

#### Horario Estándar
```sql
id: '00000000-0000-0000-0000-000000000020'
name: 'Horario Estándar 8AM-5PM'
monday_start - friday_start: '08:00'
monday_end - friday_end: '17:00'
break_duration: 60 minutos
```

### **Mapeo de Empleados**

| Campo | Valor | Notas |
|-------|-------|-------|
| `company_id` | UUID fijo | Empresa principal |
| `department_id` | Mapeado por rol | Función automática |
| `work_schedule_id` | UUID fijo | Horario estándar |
| `employee_code` | EMP-0001, EMP-0002... | Auto-generado |
| `base_salary` | Original o 15000.00 | Salario por defecto para NULLs |
| `status` | 'active' / 'inactive' | Normalizado desde Activo/Inactivo |

## 📈 Reportes de Validación

### **Empleados por Departamento**
- Distribución de empleados por área
- Salarios promedio, mínimo y máximo
- Conteo de activos vs inactivos

### **Empleados que Requieren Revisión**
- Empleados con salario por defecto aplicado
- Empleados inactivos contratados recientemente
- DNIs con formato corregido

### **Integridad de Datos**
- Verificación de campos requeridos
- Validación de formatos (DNI, fechas, salarios)
- Integridad referencial entre tablas

## 🔍 Casos Especiales Manejados

### **18 Empleados con Salario NULL**
```sql
-- Aplicación de salario por defecto
base_salary = COALESCE(original_salary, 15000.00)
```

### **1 DNI con Formato Incorrecto**
```sql
-- De: '0801 2006 13174' 
-- A:  '0801-2006-13174'
```

### **1 Registro con Datos Mezclados**
```sql
-- Original: 'Francisco Javier Mendez Montenegro Manager','21000'
-- Corregido: role = 'Manager', salary = 21000.00
```

## ✅ Verificación de Éxito

### **Conteos Esperados**
- **Total empleados**: 51
- **Empleados activos**: ~35
- **Empleados inactivos**: ~16
- **Departamentos creados**: 6
- **Horarios de trabajo**: 1

### **Tests de Funcionalidad**
- ✅ Búsqueda por DNI funciona
- ✅ Todos los empleados activos tienen horario
- ✅ No hay duplicados de DNI
- ✅ Referencias entre tablas válidas

## 🎯 Próximos Pasos

1. **Ejecutar la migración** usando el script automatizado
2. **Revisar empleados** con salario por defecto
3. **Probar el sistema** de registro de asistencia
4. **Ajustar salarios** según políticas de la empresa
5. **Configurar usuarios** de Supabase Auth para empleados

## 🚨 Notas Importantes

- ⚠️ **Backup automático**: Se crea backup antes de migrar
- ⚠️ **Idempotente**: Se puede ejecutar múltiples veces safely
- ⚠️ **Rollback**: En caso de error, restaurar desde backup
- ⚠️ **Metadata**: Se preserva información de migración para auditoría

## 📞 Soporte

Si encuentras problemas durante la migración:

1. Revisar logs en `/tmp/migration_output.log`
2. Ejecutar validaciones por separado
3. Verificar conexión a Supabase
4. Restaurar desde backup si es necesario

---

**✨ ¡El sistema estará listo para registrar asistencia después de la migración!**
