# Diagnóstico Completo: Error 400 en Payroll Preview

## Flujo Completo Verificado

### 1. Frontend (✅ Verificado)
- **Componente**: `PayrollManagerNew` → `usePayrollManager` → `loadUnifiedData`
- **Función**: `fetchUnifiedPayroll` en `lib/payroll-unified.ts`
- **Llamada**: `GET /api/payroll/preview?year=2025&month=12&quincena=1&tipo=CON`
- **Manejo de Error**: Si `!planillaRes.ok`, lanza error con status code

### 2. Middleware (✅ Verificado)
- **Archivo**: `middleware.ts`
- **Acción**: Solo bloquea `/api/debug/*` en producción
- **Resultado**: NO interfiere con `/api/payroll/*`

### 3. Backend (✅ Verificado)
- **Endpoint**: `pages/api/payroll/preview.ts`
- **Autenticación**: `requireCompanyAccess` → OK
- **Validación de Parámetros**: ✅ OK
- **Búsqueda de Empleados**: ✅ OK (encuentra empleados activos)
- **Búsqueda de Asistencia**: ✅ OK (encuentra registros)
- **Filtro de Asistencia**: ❌ PROBLEMA AQUÍ

## Problema Identificado

El filtro de asistencia está rechazando a TODOS los empleados, incluso cuando:
- Hay empleados activos
- Hay registros de asistencia con `check_in`
- Los registros están en el rango de fechas correcto

### Posibles Causas:

1. **Status del registro**: Los registros tienen `status: 'absent'` y el filtro los excluye
2. **Employee ID mismatch**: Los `employee_id` en los registros no coinciden con los IDs de empleados
3. **Pay Type no definido**: El `pay_type` del empleado es `null` y el default no funciona correctamente
4. **Filtro demasiado estricto**: El filtro requiere condiciones que no se cumplen

## Solución Implementada

### 1. Logging Detallado Agregado
- Log de todos los registros de asistencia encontrados
- Log de cada empleado y por qué es aceptado/rechazado
- Log del `pay_type` de cada empleado
- Log de los registros de asistencia de cada empleado

### 2. Mejora del Filtro
- Verificación de TODOS los registros del empleado antes de filtrar
- Logging detallado de cada paso del filtro
- Mejor manejo de casos edge (null, undefined)

## Próximos Pasos

1. **Ejecutar el preview nuevamente** y revisar los logs del servidor
2. **Verificar en los logs**:
   - ¿Cuántos registros de asistencia se encontraron?
   - ¿Qué `status` tienen los registros?
   - ¿Los `employee_id` coinciden?
   - ¿Qué `pay_type` tienen los empleados?
   - ¿Por qué cada empleado es rechazado?

3. **Basado en los logs**, ajustar el filtro si es necesario

## Archivos Modificados

- `pages/api/payroll/preview.ts`: Agregado logging detallado y mejorado el filtro

