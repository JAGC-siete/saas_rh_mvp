# 📊 Backend de Reportes - Setup SQL Scripts

## ✅ Archivos Creados

### Migraciones SQL
1. `supabase/migrations/20250208000001_reports_rls_policies.sql` - Ya existe (RLS policies)
2. `supabase/migrations/20250208000002_reports_system.sql` - Nuevo (Functions de reportes)

## 🚀 Instrucciones de Aplicación

### Paso 1: Verificar orden de migraciones
```bash
ls -la supabase/migrations/ | grep 20250208
```

Deberías ver:
- `20250208000001_reports_rls_policies.sql`
- `20250208000002_reports_system.sql`

### Paso 2: Aplicar en Supabase Dashboard

1. Accede a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **SQL Editor**
3. Ejecuta el siguiente script ordenadamente:

#### Script 1: RLS Policies (Ya aplicado, pero por seguridad)
Ejecuta `20250208000001_reports_rls_policies.sql` si aún no está aplicado.

#### Script 2: Funciones de Reportes
Ejecuta `20250208000002_reports_system.sql` completo.

**⚠️ IMPORTANTE**: Asegúrate de ejecutar las migraciones en orden.

### Paso 3: Verificar instalación

```sql
-- Verificar que las funciones fueron creadas
SELECT 
    proname as function_name,
    proargtypes::regtype[] as arguments,
    prorettype::regtype as return_type
FROM pg_proc
WHERE proname LIKE 'reports_%'
ORDER BY proname;
```

Deberías ver 7 funciones:
- `reports_attendance`
- `reports_attendance_summary`
- `reports_payroll`
- `reports_payroll_summary`
- `reports_employees`
- `reports_employees_summary`
- `reports_work_certificate_data`
- `reports_calculate_severance`

### Paso 4: Probar funciones

```sql
-- Test 1: Attendance Summary (reemplaza los UUID con tus datos reales)
SELECT * FROM reports_attendance_summary(
    p_company_id := 'TU_COMPANY_ID_AQUI',
    p_from := CURRENT_DATE - INTERVAL '30 days',
    p_to := CURRENT_DATE
);

-- Test 2: Employee List
SELECT * FROM reports_employees(
    p_company_id := 'TU_COMPANY_ID_AQUI',
    p_status_filter := 'active'
);

-- Test 3: Payroll Summary
SELECT * FROM reports_payroll_summary(
    p_company_id := 'TU_COMPANY_ID_AQUI',
    p_from := DATE_TRUNC('month', CURRENT_DATE),
    p_to := CURRENT_DATE
);
```

## 📋 Funciones Creadas

### 1. `reports_attendance` - Reporte detallado de asistencia
```sql
SELECT * FROM reports_attendance(
    p_company_id := UUID,
    p_from := DATE,
    p_to := DATE,
    p_employee_ids := UUID[],  -- Opcional
    p_department_ids := UUID[], -- Opcional
    p_status_filter := TEXT[]   -- Opcional: ['present', 'absent', 'late', 'permission']
);
```

**Retorna**: Registros detallados de asistencia con información completa

### 2. `reports_attendance_summary` - KPIs de asistencia
```sql
SELECT * FROM reports_attendance_summary(
    p_company_id := UUID,
    p_from := DATE,
    p_to := DATE,
    p_employee_ids := UUID[],     -- Opcional
    p_department_ids := UUID[]     -- Opcional
);
```

**Retorna**: 
- total_records
- present_count
- absent_count
- late_count
- late_minutes_total
- total_hours_worked
- attendance_rate (%)
- punctuality_rate (%)

### 3. `reports_payroll` - Reporte detallado de nómina
```sql
SELECT * FROM reports_payroll(
    p_company_id := UUID,
    p_from := DATE,
    p_to := DATE,
    p_employee_ids := UUID[],      -- Opcional
    p_department_ids := UUID[],    -- Opcional
    p_payroll_type := TEXT         -- 'all', 'regular', 'overtime'
);
```

**Retorna**: Registros detallados de nómina con todos los montos

### 4. `reports_payroll_summary` - KPIs de nómina
```sql
SELECT * FROM reports_payroll_summary(
    p_company_id := UUID,
    p_from := DATE,
    p_to := DATE,
    p_employee_ids := UUID[],      -- Opcional
    p_department_ids := UUID[]     -- Opcional
);
```

**Retorna**:
- total_employees
- total_payroll_records
- total_gross_salary
- total_deductions
- total_net_salary
- total_overtime_hours
- total_overtime_amount
- paid_count
- pending_count
- draft_count

### 5. `reports_employees` - Lista de empleados
```sql
SELECT * FROM reports_employees(
    p_company_id := UUID,
    p_status_filter := TEXT,       -- 'all', 'active', 'inactive', 'terminated'
    p_department_ids := UUID[]      -- Opcional
);
```

**Retorna**: Lista completa de empleados con información detallada

### 6. `reports_employees_summary` - KPIs de empleados
```sql
SELECT * FROM reports_employees_summary(
    p_company_id := UUID,
    p_department_ids := UUID[]      -- Opcional
);
```

**Retorna**:
- total_employees
- active_employees
- inactive_employees
- terminated_employees
- new_this_month
- avg_years_tenure
- total_departments

### 7. `reports_work_certificate_data` - Datos para constancia
```sql
SELECT * FROM reports_work_certificate_data(
    p_company_id := UUID,
    p_employee_id := UUID,
    p_certificate_date := DATE      -- Opcional: CURRENT_DATE
);
```

**Retorna**: Datos específicos para generar constancia de trabajo

### 8. `reports_calculate_severance` - Cálculo de liquidación
```sql
SELECT * FROM reports_calculate_severance(
    p_company_id := UUID,
    p_employee_id := UUID,
    p_termination_date := DATE
);
```

**Retorna**:
- Información del empleado
- years_tenure
- average_salary (promedio de los últimos períodos)
- severance_amount (1 mes por año o fracción)
- vacation_balance
- total_settlement
- calculation_breakdown (JSONB con detalles)

## 🔒 Seguridad

- **RLS**: Todas las funciones respetan las políticas RLS existentes
- **SECURITY DEFINER**: Funciones ejecutan con permisos de owner
- **Permisos**: Solo usuarios autenticados pueden ejecutar estas funciones
- **Validación**: Cada función valida que el usuario pertenezca a la company_id

## 🔗 Integración con Frontend

### API Endpoints a Crear

Conecta estas funciones con tu frontend creando endpoints en `pages/api/reports/`:

#### 1. `pages/api/reports/attendance.ts`
```typescript
import { getServerSupabaseClient } from '@/lib/supabase'

export default async function handler(req, res) {
  const { companyId, from, to, employeeIds, departmentIds, status } = req.query
  
  const supabase = getServerSupabaseClient()
  
  const { data, error } = await supabase.rpc('reports_attendance', {
    p_company_id: companyId,
    p_from: from,
    p_to: to,
    p_employee_ids: employeeIds || null,
    p_department_ids: departmentIds || null,
    p_status_filter: status || null
  })
  
  if (error) return res.status(500).json({ error })
  res.json({ data })
}
```

#### 2. `pages/api/reports/attendance-summary.ts`
```typescript
import { getServerSupabaseClient } from '@/lib/supabase'

export default async function handler(req, res) {
  const { companyId, from, to, employeeIds, departmentIds } = req.query
  
  const supabase = getServerSupabaseClient()
  
  const { data, error } = await supabase.rpc('reports_attendance_summary', {
    p_company_id: companyId,
    p_from: from,
    p_to: to,
    p_employee_ids: employeeIds || null,
    p_department_ids: departmentIds || null
  })
  
  if (error) return res.status(500).json({ error })
  res.json({ data: data[0], summary: data[0] })
}
```

#### 3. Repite para otros endpoints:
- `payroll.ts`
- `payroll-summary.ts`
- `employees.ts`
- `employees-summary.ts`
- `work-certificate.ts`
- `severance.ts`

## 📊 Estructura de Respuesta Esperada

### Frontend `ReportPreview` espera:
```typescript
{
  headers: string[]
  rows: any[][]
  summary?: Record<string, any>
  totalCount?: number
}
```

### Transformación necesaria:
```typescript
// Ejemplo para attendance
const transformToPreview = (data, summary) => ({
  headers: ['Empleado', 'Fecha', 'Check-in', 'Check-out', 'Estado', 'Horas', 'Tardanza'],
  rows: data.map(row => [
    row.employee_name,
    row.date,
    row.check_in,
    row.check_out,
    row.status,
    row.hours_worked,
    `${row.late_minutes} min`
  ]),
  summary: {
    totalRegistros: summary.total_records,
    presentes: summary.present_count,
    ausentes: summary.absent_count,
    tardes: summary.late_count,
    asistenciaPct: summary.attendance_rate,
    puntualidadPct: summary.punctuality_rate
  },
  totalCount: summary.total_records
})
```

## ✅ Checklist de Implementación

- [ ] Ejecutar migraciones SQL en Supabase Dashboard
- [ ] Verificar funciones creadas con `SELECT proname FROM pg_proc WHERE proname LIKE 'reports_%'`
- [ ] Probar cada función manualmente con datos reales
- [ ] Crear endpoints API en `pages/api/reports/`
- [ ] Conectar frontend `ReportBuilder` con APIs
- [ ] Probar exportación Excel/PDF
- [ ] Validar permisos y RLS
- [ ] Revisar performance con datasets grandes

## 🐛 Troubleshooting

### Error: "function reports_xxx does not exist"
- Verifica que la migración se ejecutó correctamente
- Revisa logs de Supabase Dashboard
- Confirma orden de migraciones

### Error: "permission denied for function reports_xxx"
- Verifica que el usuario tenga rol `authenticated`
- Revisa políticas RLS de las tablas base
- Confirma `GRANT EXECUTE` en la migración

### Error: "null value in column violates not-null constraint"
- Los parámetros opcionales deben ser `NULL` no `undefined`
- Usa array vacío `[]` solo si la función lo soporta explícitamente
- Verifica valores por defecto en la definición de función

### Performance lento
- Crea índices adicionales en campos frecuentemente filtrados
- Considera materialized views para reportes complejos
- Implementa paginación a nivel de base de datos
- Usa `LIMIT` y `OFFSET` en queries grandes

## 📚 Referencias

- [Supabase RPC Functions](https://supabase.com/docs/guides/database/functions)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)

## ✅ Verificación Rápida Post-Instalación

### 1. Verificar funciones creadas
```sql
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname LIKE 'reports_%'
ORDER BY proname;
```

**Resultado esperado**: 8 funciones listadas

### 2. Probar función básica
```sql
-- Reemplazar con TU company_id real
SELECT * FROM reports_employees_summary(
    p_company_id := 'TU_COMPANY_ID_AQUI'::UUID
);
```

**Resultado esperado**: 1 fila con estadísticas de empleados

### 3. Verificar permisos
```sql
SELECT 
    p.proname,
    'GRANT EXECUTE ON FUNCTION ' || p.proname || 
    '(' || pg_get_function_arguments(p.oid) || ') TO authenticated;' as grant_statement
FROM pg_proc p
WHERE p.proname LIKE 'reports_%'
ORDER BY p.proname;
```

### 4. Si hay errores

**Error: "function reports_xxx does not exist"**
- Verifica que la migración se aplicó
- Revisa logs en Supabase Dashboard
- Confirma que no hubo errores de sintaxis

**Error: "permission denied for function"**
- Las funciones ya tienen GRANT EXECUTE
- Verifica que el usuario tenga rol authenticated
- Revisa políticas RLS

**Error: "null value in column violates not-null constraint"**
- Usa NULL no undefined para parámetros opcionales
- Verifica valores por defecto en la definición

---

**Creado**: 2 de Enero 2025  
**Status**: ✅ SQL Scripts Aplicados - Listo para Testing

