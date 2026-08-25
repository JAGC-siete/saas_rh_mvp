---
name: payroll
description: >-
  Protocolo canónico del módulo PAYROLL (preview→authorize, run lines, statutory,
  overtime pay, vouchers). Use when working on payroll_runs, payroll_run_lines,
  payroll_adjustments, company_payroll_configs, IHSS/ISR/RAP, séptimo día,
  deduction plans, cesantías, 13º/14º, planilla PDF, vouchers, or files under
  lib/payroll/, pages/api/payroll/, lib/payroll-*.ts. Do not use for punch ingest,
  daily-close, AHC engine, or employee CRUD.
---

# PAYROLL

Cargar este skill **antes** de leer, nombrar o modificar código del módulo. Código > docs. Path vivo: `preview` → `payroll_run_lines`. Path paralelo `calculate.ts` → `payroll_records` es **legacy**.

Detalle de superficie: [reference.md](reference.md). Si el cambio toca master data o AHC, cargar `employees` o `attendance`.

## Frontera

**Entra:** motor de corrida, UI planilla, PDF/vouchers/email/WhatsApp, cesantías, 13º/14º (pago), deduction plans, accounting derived, custom_fields.

**No entra:** cálculo AHC / punches / daily-close; CRUD employees; leave CRUD (solo créditos pagados); journal contable (consume provisiones).

Subdominios — no mezclar: motor corrida ≠ PDF ≠ cesantías ≠ 13/14 pago ≠ `labor-provisions` (provisión contable, no pago).

## Vocabulario

| Término | Concepto |
|---------|----------|
| `payroll_runs` | Corrida `(company_id, year, month, quincena, tipo)` |
| `payroll_run_lines` | Línea: `calc_*` motor + `eff_*` post-ajuste + `metadata` |
| `payroll_adjustments` | Override campo a campo; trigger `apply_adjustment_update_eff` |
| `payroll_records` | Modelo **paralelo/legacy** |
| Status | `draft` → `edited` → `authorized` → `distributed` (`paid` existe en freeze) |
| `tipo` | `CON` \| `SIN` \| `2PAGOS` |
| `pay_type` efectivo | `fixed` \| `hourly` \| `admin_floor` |
| Overtime bands | `evening_25`, `night_50`, `late_75`, `morning_25`, `holiday_100` |
| AHC | Input de horas/HE — no punches |

## Pipeline canónico

```
preflight / ensurePeriodAhcFresh
 → POST /api/payroll/preview   (draft run + lines; readonly si authorized)
 → edits: /edit | adjust-fixed-* | update-custom-fields | zero-statutory
 → POST /pre-authorize         (status=edited)
 → POST /authorize             (authorized; ISR YTD; burn plazos)
 → PDF planilla | voucher | email | WhatsApp
```

**CANÓNICO:** `pages/api/payroll/preview.ts` + `lib/payroll/*` + tablas `payroll_runs` / `payroll_run_lines` / `payroll_adjustments` / `company_payroll_configs`.

**No canónico:** `calculate.ts`→`payroll_records`; `lib/payroll-client-specific.ts` (UUIDs hardcode); RPCs `create_or_update_payroll_run` / `insert_payroll_line` (sin callers); `lib/services/payroll/unified.ts` (eliminado — usar `lib/payroll-unified.ts`).

## Invariantes

1. Precedencia **Capa 3 > 2 > 1** (líneas/ajustes/AHC > config empresa/empleado > `labor_laws`). “1→2→3” = fuerza creciente, no “capa 1 gana”.
2. TZ: `America/Tegucigalpa`. Moneda: HNL.
3. Factor horario: `HONDURAS_LABOR_FACTOR = 240` (producto fijo; no “corregir” a 176).
4. Statutory: leer `tax_brackets` / `payroll_statutory_params`. Fail-fast SLV/GTM. **No inventar tasas en PRs nuevos.**
5. Holiday OT en código: `holiday_100` → **×2.00**. Ficha/ONBOARDING (+75%) están desfasadas.
6. Runs `authorized|distributed|paid`: `metadata.pay_type` y `eff_*` inmutables. PDF usa stamp, no ficha live.

## Contratos

**Consume employees (read):** salary, `pay_type`, `attendance_required`, `pay_overtime`, `payment_frequency`, bank.

**Consume attendance (read):** `attendance_records` (días/inclusión), AHC (horas/HE) vía `ensure-period-ahc.ts`. No reescribe punches ni sustituye el motor de asistencia.

**No hace:** CRUD empleados, gestionar leave requests, insertar `attendance_events`.

## Anti-patrones

- Nuevo cliente one-off en `CLIENT_PAYROLL_CONFIGS` — usar `company_payroll_configs.custom_fields`.
- Tratar `statutory-zero-override` como default de negocio.
- Hardcodear tasas patronales nuevas (`employer-contributions.ts` ya es deuda; no extender el patrón).
- Mezclar 13/14 de **pago** (`thirteenth-fourteenth/*`) con `labor-provisions.ts` (contable).
- Confiar en Ficha §5.2 para RPCs create/insert — preview hace upsert directo.

## Workflow de cambio

| Cambio | Dónde |
|--------|--------|
| Earning/deduction genérico | `custom_fields` BD → engine → preview fold → `payroll-pdf-columns` / voucher |
| ISR / tramos | `payroll_statutory_params` o `tax_brackets` + `lib/tax/honduras-tax.ts` + tests |
| HE franjas/% | `overtime-pay.ts` + `lib/attendance/overtime-bands.ts` + RPC AHC; alinear docs |
| Columna PDF | `payroll-pdf-columns.ts` |
| Campo voucher | `voucher-from-run-line.ts` / `receipt.ts` |
| Nuevo `pay_type` | `resolve-effective-pay-type.ts` + preview + inclusion + tests `payroll-pay-type-overtime` |
| Recalc post master-data | `reset-line-recalc` o regenerar preview (solo mutable) |
| Cesantía / 13-14 | `cesantias*` / `thirteenth-fourteenth/*` |

Tests ancla: `tests/payroll-*.ts`.
