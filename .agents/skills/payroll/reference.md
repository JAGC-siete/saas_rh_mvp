# PAYROLL — referencia de superficie

Leer desde `SKILL.md`. Verificar `docs/FICHA_TECNICA_SAAS.md` §3.2/§4.2 y `docs/CLIENT_SPECIFIC_PAYROLL.md` contra código.

## Top-level

| Path | Veredicto |
|------|-----------|
| `lib/payroll/*` | CANÓNICO dominio |
| `lib/payroll-calculation-engine.ts` | CANÓNICO custom_fields (no sustituye preview) |
| `lib/payroll-unified.ts` | CANÓNICO UI merge |
| `lib/payroll-api.ts` | CANÓNICO cliente HTTP |
| `lib/payroll-client-specific.ts` | TRANSICIONAL — preferir BD `custom_fields` |
| `lib/services/payroll/unified.ts` | ELIMINADO |

## `lib/payroll/*` (mapa corto)

Motor: `preview` consume `fixed-line-recalc.ts`, `statutory-deductions-compute.ts`, `overtime-pay.ts`, `septimo-dia.ts`, `calculate-period-base-salary.ts`, `payroll-attendance-inclusion.ts`, `resolve-effective-pay-type.ts`, `resolve-config.ts`, `ensure-period-ahc.ts`, `admin-floor-hours.ts`.

Ajustes: `apply-customs-after-fixed-recalc.ts`, `custom-fields-eff-amounts.ts`, `preview-preserve-line.ts`, `preview-orphan-lines.ts`, `preview-authorized-readonly.ts`, `statutory-zero-override.ts`, `standard-adjustment-fields.ts`.

PDF/voucher: `report.ts`, `receipt.ts`, `voucher-from-run-line.ts`, `voucher-preview.ts`, `planilla-from-run.ts`, `planilla-preview.ts`, `payroll-pdf-columns.ts`, `pdf-layout.ts`, `resolve-display-net.ts`.

Hermanos: `cesantias.ts`, `thirteenth-fourteenth/*` (pago), `labor-provisions.ts` (contable), `deduction-plan-authorize.ts`, `isr-ytd.ts`, `employer-contributions.ts`.

Constantes: `HONDURAS_LABOR_FACTOR=240` en `constants.ts`.

## APIs (`pages/api/payroll/`)

Flujo: `preview` → `pre-authorize` → `authorize` → PDF/vouchers/`send-*`.

Edición: `edit.ts` (RPC `apply_payroll_adjustment`), `reset-line-recalc.ts`, `adjust-fixed-days.ts`, `adjust-fixed-overtime.ts`, `update-custom-fields.ts`, `zero-statutory-deductions.ts`.

Ops: `draft.ts`, `config.ts`, `run-lines.ts`, `records.ts`, `preflight.ts`, `recalculate-missing-ahc*.ts`, `export.ts`, `compare.ts`, `trend.ts`, `upcoming-periods.ts`.

13º/14º: `pages/api/13-14-salario/preview.ts`. Cesantías: `cesantias/calculate.ts`. `client-specific.ts` = LEGACY PROHALCA.

## RPCs

| RPC | Uso TS |
|-----|--------|
| `apply_payroll_adjustment` | `edit.ts` |
| `payroll_recalc_fixed_days_apply` | adjust-fixed-* (fallback tablas) |
| `calculate_attendance_hours_batch` | vía `ensure-period-ahc` |
| `payroll_paid_leave_work_day_credits` | preview |
| `create_or_update_payroll_run` / `insert_payroll_line` | **no llamados** — preview upsert directo |

## Tablas

Núcleo ficha: `payroll_runs`, `payroll_run_lines`, `payroll_records`, `payroll_adjustments`, `payroll_uploads`, `company_payroll_configs`, `labor_laws`, `tax_brackets`.

Extendidas vivas: `employee_deduction_plans`, `payroll_statutory_params`, `payroll_derived_concepts`, `payroll_derived_concept_sources`, `employee_isr_ytd`. Contrato read: `attendance_hours_calculation`.

## Ajustes

| Tipo | Mecánica |
|------|----------|
| Standard (`hours/bruto/ihss/rap/isr/neto`) | `payroll_adjustments` → trigger `eff_*` |
| Fixed days / OT | `adjust-fixed-*` + `fixed-line-recalc` + fold customs |
| Custom fields | metadata JSONB + `custom-fields-eff-amounts` |
| Deduction plans | Autopliegue en preview; burn plazos en authorize |
| Recalc línea | `reset-line-recalc` → preview regenera |

## Discrepancias docs ↔ código

| # | Docs | Código |
|---|------|--------|
| D1 | HE feriado +75% | `holiday_100` ×2.00 |
| D2 | HE diurna +25% / nocturna +50% | 5 franjas + feriado |
| D3 | RPCs create/insert “relevantes” | Preview upsert directo |
| D4 | Ficha omite plans/statutory/derived | Uso activo |
| D5 | `payroll_records` principal | Canónico UI = `payroll_run_lines` |
| D6 | Capas 3>2>1 | Alineado — OK |
| D7 | Client-specific “already implemented” | Import comentado en `UnifiedPayrollTable` |
| D8 | Tasas desde tax_brackets | Hardcode `employer-contributions.ts` |
| D9 | Auditoría cuestiona 240 | Producto fijo 240 |
| D10 | `RunStatus` sin `paid` | Freeze incluye `paid` |

## Tests ancla

`tests/payroll-*.ts`, `statutory-*`, `thirteenth-fourteenth`, `deduction-plan-*`, `salary-payroll-sync`.
