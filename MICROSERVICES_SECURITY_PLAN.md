# 🔧 PLAN COMPLETO: ASEGURAR COMUNICACIÓN SEGURA DE MICROSERVICIOS

## 🎯 PROBLEMA IDENTIFICADO

**CRÍTICO**: Los empleados migrados NO tienen `work_schedule_id` asignado, pero el sistema de asistencia requiere esta información para validar horarios.

**Flujo actual roto:**
1. ❌ Empleado ingresa últimos 5 dígitos DNI
2. ❌ Sistema busca empleado (EXITOSO)
3. ❌ Sistema busca horario → **NULL/UNDEFINED**
4. ❌ Validación de check-in/out falla

## 📋 PLAN DE IMPLEMENTACIÓN

### FASE 1: CREAR HORARIO ESTÁNDAR Y ASIGNAR A EMPLEADOS (30 min)

#### 1.1 Crear Work Schedule Estándar
```sql
-- Paso 1: Crear el horario estándar para Paragon
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
    (SELECT id FROM companies LIMIT 1), -- Tu empresa Paragon
    'Horario Estándar Paragon 8AM-5PM',
    '08:00', '17:00',  -- Lunes
    '08:00', '17:00',  -- Martes  
    '08:00', '17:00',  -- Miércoles
    '08:00', '17:00',  -- Jueves
    '08:00', '17:00',  -- Viernes
    NULL, NULL,        -- Sábado (no trabajan)
    NULL, NULL,        -- Domingo (no trabajan)
    60,                -- 1 hora de almuerzo
    'America/Tegucigalpa'
) ON CONFLICT DO NOTHING;
```

#### 1.2 Asignar Horario a TODOS los Empleados Activos
```sql
-- Paso 2: Actualizar todos los empleados para que tengan work_schedule_id
UPDATE employees 
SET work_schedule_id = (
    SELECT id FROM work_schedules 
    WHERE name = 'Horario Estándar Paragon 8AM-5PM' 
    LIMIT 1
),
company_id = (SELECT id FROM companies LIMIT 1)
WHERE work_schedule_id IS NULL 
AND status = 'active';
```

### FASE 2: VALIDAR Y CORREGIR APIs DE ASISTENCIA (45 min)

#### 2.1 Verificar API Lookup
```typescript
// pages/api/attendance/lookup.ts
// DEBE incluir work_schedules en el SELECT
const { data: employees, error: empError } = await supabase
  .from('employees')
  .select(`
    id, name, dni, position, status,
    companies!inner (name),
    work_schedules!inner (  // <-- CRÍTICO: !inner para requerir horario
      monday_start, monday_end,
      tuesday_start, tuesday_end,
      wednesday_start, wednesday_end,
      thursday_start, thursday_end,
      friday_start, friday_end,
      saturday_start, saturday_end,
      sunday_start, sunday_end
    )
  `)
  .ilike('dni', `%${last5}`)
  .eq('status', 'active')  // <-- Solo empleados activos
```

#### 2.2 Corregir API Register
```typescript
// pages/api/attendance/register.ts
// VALIDACIÓN MEJORADA:
if (!employees || employees.length === 0) {
  return res.status(404).json({ 
    error: 'Empleado no encontrado o sin horario asignado' 
  })
}

if (employees.length > 1) {
  return res.status(400).json({ 
    error: 'Múltiples empleados encontrados. Contacte a RH.' 
  })
}

// VALIDAR QUE TENGA HORARIO
const employee = employees[0]
const schedule = employee.work_schedules
if (!schedule) {
  return res.status(400).json({ 
    error: 'Empleado sin horario asignado. Contacte a RH.' 
  })
}
```

### FASE 3: IMPLEMENTAR VALIDACIONES DE SEGURIDAD (30 min)

#### 3.1 Rate Limiting para APIs Públicas
```typescript
// middleware/rateLimiting.ts
const attempts = new Map()

export function rateLimitByIP(ip: string, maxAttempts = 10, windowMs = 60000) {
  const now = Date.now()
  const userAttempts = attempts.get(ip) || { count: 0, resetTime: now + windowMs }
  
  if (now > userAttempts.resetTime) {
    userAttempts.count = 0
    userAttempts.resetTime = now + windowMs
  }
  
  userAttempts.count++
  attempts.set(ip, userAttempts)
  
  return userAttempts.count <= maxAttempts
}
```

#### 3.2 Validación de Input Mejorada
```typescript
// utils/validation.ts
export function validateDNI5Digits(last5: string): boolean {
  return /^\d{5}$/.test(last5) && last5.length === 5
}

export function sanitizeInput(input: string): string {
  return input.replace(/[^0-9]/g, '').slice(0, 5)
}
```

### FASE 4: LÓGICA DE HORARIOS MEJORADA (60 min)

#### 4.1 Función de Detección de Día Laboral
```typescript
// utils/workSchedule.ts
export function getWorkScheduleForDay(schedule: WorkSchedule, dayOfWeek: number) {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const todayName = dayNames[dayOfWeek]
  
  const checkIn = schedule[`${todayName}_start` as keyof WorkSchedule]
  const checkOut = schedule[`${todayName}_end` as keyof WorkSchedule]
  
  // Si no hay horario para este día, no es día laboral
  if (!checkIn || !checkOut) {
    return null
  }
  
  return { checkIn, checkOut }
}
```

#### 4.2 Validación de Día Laboral
```typescript
// En register.ts - ANTES de procesar asistencia
const todaySchedule = getWorkScheduleForDay(schedule, dayOfWeek)
if (!todaySchedule) {
  return res.status(400).json({ 
    error: 'Hoy no es día laboral según tu horario' 
  })
}
```

## 🔍 SCRIPTS DE VERIFICACIÓN

### Script 1: Verificar Empleados sin Horario
```sql
SELECT 
    COUNT(*) as empleados_sin_horario,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as activos_sin_horario
FROM employees 
WHERE work_schedule_id IS NULL;
```

### Script 2: Test de API Lookup
```bash
curl -X POST http://localhost:3000/api/attendance/lookup \
  -H "Content-Type: application/json" \
  -d '{"last5": "00731"}' # Jorge Arturo
```

### Script 3: Validar Estructura de Horarios
```sql
SELECT 
    e.name,
    e.dni,
    e.status,
    ws.name as horario,
    ws.monday_start,
    ws.monday_end
FROM employees e
LEFT JOIN work_schedules ws ON e.work_schedule_id = ws.id
WHERE e.status = 'active'
ORDER BY e.name;
```

## ⚠️ VALIDACIONES CRÍTICAS ADICIONALES

### 1. Empleados Inactivos
```sql
-- Los empleados inactivos NO deben poder registrar asistencia
UPDATE employees SET status = 'inactive' 
WHERE status = 'Inactivo';  -- Normalizar el status
```

### 2. Validación de Duplicados DNI
```sql
-- Verificar que no hay duplicados en últimos 5 dígitos
SELECT 
    RIGHT(dni, 5) as last5,
    COUNT(*) as count,
    STRING_AGG(name, ', ') as empleados
FROM employees 
WHERE status = 'active'
GROUP BY RIGHT(dni, 5)
HAVING COUNT(*) > 1;
```

### 3. Logs de Auditoría
```typescript
// utils/auditLog.ts
export async function logAttendanceAttempt(
  last5: string, 
  success: boolean, 
  error?: string,
  ip?: string
) {
  await supabase.from('audit_logs').insert({
    action: 'attendance_lookup',
    details: { last5, success, error, ip },
    created_at: new Date().toISOString()
  })
}
```

## 🚀 ORDEN DE EJECUCIÓN (2-3 horas total)

1. **AHORA MISMO** (15 min): Ejecutar scripts SQL para crear horario y asignar a empleados
2. **Siguiente** (30 min): Verificar y corregir APIs de lookup/register  
3. **Después** (45 min): Implementar validaciones de seguridad
4. **Finalmente** (60 min): Testing completo del flujo end-to-end

## 📊 MÉTRICAS DE ÉXITO

- ✅ **100% empleados activos** tienen `work_schedule_id`
- ✅ **0 errores** en API lookup con empleados válidos  
- ✅ **Validación correcta** de días laborales vs no laborales
- ✅ **Rate limiting** protege APIs públicas
- ✅ **Logs de auditoría** para troubleshooting

**¿Empezamos con el primer script SQL para crear y asignar horarios?**
