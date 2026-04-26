# Análisis: Por qué no se escriben datos en `attendance_records`

## Problemas Potenciales Identificados

### 1. **Falta de `SUPABASE_SERVICE_ROLE_KEY` (CRÍTICO)**

**Problema:**
- `createAdminClient()` en `lib/supabase/server.ts` intenta usar `SUPABASE_SERVICE_ROLE_KEY`
- Si falta, cae a `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon key)
- El anon key **SÍ está sujeto a RLS** y requiere autenticación
- En un webhook **NO hay usuario autenticado** (`auth.uid()` es `null`)
- Las políticas RLS bloquean la inserción

**Evidencia:**
```typescript
// lib/supabase/server.ts línea 141
const keyToUse = serviceKey || anonKey
if (!serviceKey) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY is missing. Falling back to anon key...')
}
```

**Solución:**
- Verificar que `SUPABASE_SERVICE_ROLE_KEY` esté configurado en producción
- El service role key bypassa RLS completamente

---

### 2. **Políticas RLS de `attendance_records` sin `WITH CHECK` para INSERT**

**Problema:**
- La política "Company admins and HR managers can manage attendance" usa `FOR ALL USING`
- Para INSERT también necesita `WITH CHECK`
- Sin `WITH CHECK`, PostgreSQL puede rechazar INSERTs incluso con service role

**Evidencia:**
```sql
-- supabase/migrations/20250723000002_rls_policies.sql línea 101
CREATE POLICY "Company admins and HR managers can manage attendance" ON attendance_records
    FOR ALL USING (
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN user_profiles up ON up.company_id = e.company_id
            WHERE up.id = auth.uid() 
            AND up.role IN ('company_admin', 'hr_manager')
        )
    );
-- ❌ FALTA: WITH CHECK clause
```

**Solución:**
- Crear migración similar a `20260128000001_fix_work_schedules_rls_insert.sql`
- Agregar `WITH CHECK` con la misma condición

---

### 3. **El evento no se detecta como evento de acceso**

**Problema:**
- El código solo procesa eventos si `hasAcsEvent && acs` es verdadero
- Si el evento es solo heartbeat o tiene estructura diferente, no se procesa
- Los logs muestran que se recibe el webhook pero no hay logs de `[ACCESS EVENT]`

**Evidencia:**
```typescript
// pages/api/webhooks/attendance.ts línea 1032
if (hasAcsEvent && acs) {
  await processAccessEvent(root, acs, companyId);
  return;
}
// Si no entra aquí, no se crea registro
```

**Solución:**
- Revisar logs de `[WEBHOOK] Event classification` para ver qué tipo de evento llega
- Verificar estructura del JSON del dispositivo

---

### 4. **Empleado no encontrado por DNI**

**Problema:**
- El código busca empleado por `dni` normalizado
- Si el DNI en el dispositivo no coincide con el DNI en la BD, no se crea registro
- El código retorna silenciosamente sin error

**Evidencia:**
```typescript
// pages/api/webhooks/attendance.ts línea 872
if (!employee) {
  logger.warn('[ACCESS EVENT] Employee not found', {
    companyId,
    normalizedId,
    originalId: rawId,
    eventUid,
  });
  return; // ❌ Sale sin crear registro
}
```

**Solución:**
- Verificar logs de `[ACCESS EVENT] Employee not found`
- Comparar DNI del dispositivo con DNI en BD

---

### 5. **Error de inserción silenciado**

**Problema:**
- Los errores de inserción se logean pero no se propagan
- Si hay constraint violation o error de tipo, solo se logea
- El código continúa sin indicar fallo

**Evidencia:**
```typescript
// pages/api/webhooks/attendance.ts línea 408
if (insertError) {
  if (insertError.code === '23505') {
    // Duplicado - OK
  } else {
    logger.error('[FIXED EMPLOYEE] Error creating check_in record', insertError, {...});
    // ❌ No se propaga el error, solo se logea
  }
}
```

**Solución:**
- Revisar logs de errores con los nuevos logs detallados agregados
- Verificar constraints de la tabla `attendance_records`

---

### 6. **Evento duplicado (idempotencia)**

**Problema:**
- El código verifica `event_uid` antes de insertar
- Si el evento ya existe, se ignora silenciosamente
- Puede parecer que no se está insertando cuando en realidad es duplicado

**Evidencia:**
```typescript
// pages/api/webhooks/attendance.ts línea 831
const { data: existingRecord } = await supabase
  .from('attendance_records')
  .select('id')
  .eq('event_uid', eventUid)
  .single();

if (existingRecord) {
  logger.info('[ACCESS EVENT] Duplicate event ignored (idempotency)', {...});
  return; // ❌ Sale sin crear registro
}
```

**Solución:**
- Verificar logs de `[ACCESS EVENT] Duplicate event ignored`
- Revisar si el dispositivo está enviando el mismo evento múltiples veces

---

## Checklist de Diagnóstico

### Paso 1: Verificar Service Role Key
```bash
# En producción, verificar que existe:
echo $SUPABASE_SERVICE_ROLE_KEY
```

### Paso 2: Revisar Logs del Webhook
Buscar en los logs:
- `[WEBHOOK] Event classification` - Ver si detecta como acceso
- `[ACCESS EVENT] Starting processAccessEvent` - Confirmar que procesa
- `[ACCESS EVENT] Employee not found` - Ver si encuentra empleado
- `[FIXED EMPLOYEE] Error creating check_in record` - Ver errores de inserción
- `[ACCESS EVENT] Duplicate event ignored` - Ver si es duplicado

### Paso 3: Verificar Políticas RLS
```sql
-- Verificar políticas actuales
SELECT * FROM pg_policies 
WHERE tablename = 'attendance_records';

-- Verificar si hay WITH CHECK para INSERT
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'attendance_records' 
AND cmd IN ('INSERT', 'ALL');
```

### Paso 4: Verificar Constraints de la Tabla
```sql
-- Ver constraints de attendance_records
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'attendance_records'::regclass;
```

---

## Soluciones Recomendadas

### Solución 1: Crear migración para agregar WITH CHECK a RLS
```sql
-- Similar a 20260128000001_fix_work_schedules_rls_insert.sql
DROP POLICY IF EXISTS "Company admins and HR managers can manage attendance" ON attendance_records;

CREATE POLICY "Company admins and HR managers can manage attendance" ON attendance_records
    FOR ALL 
    USING (
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN user_profiles up ON up.company_id = e.company_id
            WHERE up.id = auth.uid() 
            AND up.role IN ('company_admin', 'hr_manager')
        )
    )
    WITH CHECK (
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN user_profiles up ON up.company_id = e.company_id
            WHERE up.id = auth.uid() 
            AND up.role IN ('company_admin', 'hr_manager')
        )
    );
```

### Solución 2: Verificar Service Role Key en producción
- Asegurar que `SUPABASE_SERVICE_ROLE_KEY` esté configurado
- El service role bypassa RLS completamente

### Solución 3: Agregar política para bypass RLS con service role
Aunque el service role debería bypassar RLS automáticamente, si hay problemas, crear política explícita:
```sql
-- Permitir inserción desde service role (anon key con RLS bypass)
CREATE POLICY "Service role can insert attendance" ON attendance_records
    FOR INSERT 
    WITH CHECK (true);
```

---

## Orden de Prioridad para Investigar

1. **ALTA**: Verificar logs de `[WEBHOOK] Event classification` - ¿Se detecta como acceso?
2. **ALTA**: Verificar `SUPABASE_SERVICE_ROLE_KEY` en producción
3. **MEDIA**: Revisar logs de `[ACCESS EVENT] Employee not found`
4. **MEDIA**: Revisar logs de errores de inserción con detalles completos
5. **BAJA**: Crear migración para agregar `WITH CHECK` a políticas RLS
