# Sistema de Deducciones y Nómina — Humano SISU

## 1. Visión General
El sistema de nómina de Humano SISU procesa deducciones en dos capas complementarias:
1. **Deducciones Estatutarias (De Ley):** Cálculos automáticos basados en la legislación de cada país (HND, SLV, GTM).
2. **Deducciones Personalizadas (Planes):** Deducciones internas de la empresa (préstamos, seguros, opticis) gestionadas mediante planes de pago.

---

## 2. Motor de Deducciones Estatutarias (Multi-País)
Implementado en `lib/payroll/statutory-deductions-compute.ts`, el motor resuelve los cálculos legales según el `countryCode` del empleado.

### Mapa de Soporte Regional

| País | Componentes Calculados | Lógica de Implementación | Base de Datos / Config |
| :--- | :--- | :--- | :--- |
| **Honduras (HND)** | IHSS, RAP, ISR | `calculateIHSS`, `calculateRAP`, `calculateISR` | `getTaxBracketsForYear` |
| **El Salvador (SLV)** | ISSS, AFP, ISR | `normalizeSlvMonthlyBrackets` (USD) | `payroll_statutory_params` |
| **Guatemala (GTM)** | IGSS, ISR | `calculateGtmMonthlyIsrFromAnnualConfig` | `payroll_statutory_params` |

### Lógica de Resolución de Parámetros
Para evitar fallos en la emisión del salario, el sistema utiliza dos modos de resolución de parámetros (`statutoryYearResolution`):
- **`exact`**: Exige una fila activa para el año exacto en `payroll_statutory_params`. (Uso en tests y auditoría).
- **`fallback`**: Si no hay configuración para el año actual, busca el año activo más reciente. (Uso en producción para evitar interrupción de nómina).

### Trazabilidad Contable

Todo cálculo generado por el motor de deducciones es trazable hasta el generador de asientos contables, garantizando que cada retención legal tenga un correlativo exacto en la contabilidad de la empresa.

**Pipeline:** `statutory-deductions-compute.ts` → `payroll_run_lines.eff_*` → `journal-generator.ts`

- **Origen de retenciones:** montos IHSS/RAP/ISR (u homólogos por país) en `payroll_run_lines`, calculados por `lib/payroll/statutory-deductions-compute.ts`.
- **Puente de trazabilidad:** `lib/accounting/payroll-statutory-trace.ts` define `PAYROLL_STATUTORY_PIPELINE` y construye el bloque `statutory` con parámetros fiscales, totales de retención y año tributario.
- **Persistencia:** al autorizar nómina, `journal-generator.ts` escribe asientos en `journal_entries` con `source_reference.statutory` (trace, retention_totals, pipeline).

Detalle del módulo contable: ver `docs/ACCOUNTING_MODULE_HONDURAS.md` (sección Trazabilidad).

---

## 3. Deducciones Personalizadas (Planes de Pago)
Flujo de sincronización entre el módulo de Deducciones $\leftrightarrow$ Payroll.

### Flujo de Datos
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

### Sincronización en el Ciclo de Vida
1. **Carga de Nómina:** El `preview` se ejecuta y aplica los planes actuales a las líneas de la corrida.
2. **Autorización:** Se incrementan los `plazos_aplicados` en los planes y se cierra el plan si se alcanza el total.
3. **Edición de Campos:** El `update-custom-fields` recalcula el `eff_neto` integrando los montos de la `metadata`.

---

## 4. Matriz de Prioridad de Cálculo
El cálculo del Neto Efectivo (`eff_neto`) sigue estrictamente este orden:
`Sueldo Bruto` $\rightarrow$ `Deducciones Estatutarias (Sujeto a Techos)` $\rightarrow$ `Deducciones de Planes` $\rightarrow$ `Sueldo Neto`.
