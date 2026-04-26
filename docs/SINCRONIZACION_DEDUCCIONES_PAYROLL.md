# Sincronización Módulo Deducciones ↔ Payroll

## Flujo de datos

```
Deducciones (employee_deduction_plans)
    │
    │  Plan: empleado, campo, monto_total, plazos_totales, monto_por_plazo, plazos_aplicados
    │
    ▼
Preview (generar nómina)
    │  - Lee planes activos (activo=true, plazos_aplicados < plazos_totales)
    │  - Aplica monto_por_plazo a metadata[field_key]
    │  - Suma a total_deductions, resta de eff_neto
    │  - Guarda _deduction_plan_ids en metadata
    ▼
payroll_run_lines
    │  metadata: { cxc_optica: 150, plan_dental: 200, _deduction_plan_ids: [...] }
    │  eff_neto: bruto - statutory - custom_plans
    ▼
Autorizar
    │  - Por cada plan en _deduction_plan_ids: plazos_aplicados += 1
    │  - Si plazos_aplicados >= plazos_totales: activo = false
    │  - Inserta en deduction_plan_applications
    ▼
Plazos actualizados en employee_deduction_plans
```

## Cambios implementados

### 1. Preview (`pages/api/payroll/preview.ts`)
- **Fixed y Hourly**: Suma `monto_por_plazo` de planes activos a `total_deductions`
- Resta de `total` (eff_neto) para reflejar deducciones en el neto
- Se aplica en tipo CON (con deducciones de ley) y SIN (solo planes, sin IHSS/RAP/ISR)

### 2. Payroll Unified (`lib/payroll-unified.ts`)
- `total_deducciones` = `eff_bruto - eff_neto` cuando hay datos de run-lines
- Incluye deducciones de planes en el total mostrado en la UI

### 3. Flujos existentes (sin cambios)
- **CustomPayrollFieldsForm**: Pre-llena campos desde planes al abrir modal
- **update-custom-fields**: Recalcula eff_neto con calculatePayroll (incluye metadata)
- **authorize**: Incrementa plazos_aplicados y registra en deduction_plan_applications

## Cuándo se sincroniza

1. **Al cargar nómina**: Preview se ejecuta y aplica planes actuales a las líneas
2. **Al autorizar**: Se incrementan plazos_aplicados en los planes
3. **Al editar campos**: update-custom-fields recalcula eff_neto con metadata

## Plan nuevo creado después de generar preview

Si el usuario crea un plan en Deducciones después de haber generado el preview:
- La próxima vez que cargue la nómina (mismo período), el preview se re-ejecuta
- El upsert sobrescribe las líneas con los planes actualizados
- Los montos y plazos del nuevo plan aparecerán en la nómina
