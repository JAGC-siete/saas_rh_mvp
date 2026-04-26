# Commit: Soporte para frecuencia de pago semanal

## Resumen
Actualización de validaciones API y UI para permitir `payment_frequency = 'semanal'` en todo el flujo. Incluye mapeo correcto entre `weekly` (frontend) y `semanal` (BD).

## Archivos modificados

### API - Empleados
- **pages/api/employees/create.ts**: Acepta `'semanal'` en `payment_frequency`.
- **pages/api/employees/update.ts**: Acepta `'semanal'` en validación de `payment_frequency`.

### Validación - Deduction Validator
- **lib/deduction-validator/client-validation.ts**: Incluye `'semanal'` en validación de modalidad de pago.
- **lib/deduction-validator/validation.ts**: Incluye `'semanal'` en normalización y tipo sanitizado.

### API - Payroll
- **pages/api/payroll/config.ts**:
  - `mapFreqToFrontend`: `semanal` → `weekly`
  - `mapFreqToDb`: `weekly` → `semanal`
  - `mapFreq` (respuesta upsert): `semanal` → `weekly`
- **pages/api/payroll/preview.ts**: `mapFreq` incluye `semanal` → `weekly` (evita caer en default `quincenal`).
- **pages/api/payroll/generate-pdf.ts**: Mapeo `semanal` → `weekly`.
- **pages/api/payroll/generate-pdf-from-run.ts**: Mapeo `semanal` → `weekly`.
- **pages/api/payroll/upcoming-periods.ts**: Soporta `weekly`/`semanal` en body y en config guardada.

### UI - Componentes
- **components/EmployeeManager.tsx**: Validación permite `'semanal'`.
- **components/AddEmployeeForm.tsx**: Opción `<option value="semanal">` en select de frecuencia.

### Tests
- **tests/deduction-validator.test.ts**: Test actualizado: `semanal` ahora es válido; test de rechazo usa `'diario'`.

## Mapeo de frecuencias

| BD (español) | Frontend (inglés) |
|--------------|-------------------|
| mensual      | monthly           |
| quincenal    | biweekly          |
| semanal      | weekly            |

## Notas
- PayrollConfigEditor (config empresa) mantiene solo biweekly/monthly por ahora; la API acepta `weekly` si se envía.
- El default cuando no hay valor sigue siendo `quincenal`/`biweekly`.
