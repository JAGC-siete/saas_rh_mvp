# Módulo Contable para Nóminas — Honduras

## Resumen

Fase 1 de la arquitectura contable: tablas de base de datos, seed de conceptos y RPC para inicializar catálogo por empresa.

## Migraciones creadas

| Archivo | Descripción |
|---------|-------------|
| `20260302000002_create_accounting_module.sql` | Tablas: payroll_concepts, chart_of_accounts, accounting_mappings, journal_entries, journal_entry_lines |
| `20260302000003_add_cost_center_to_departments.sql` | Columna `departments.cost_center_type` (ventas, administracion, produccion) |
| `20260302000004_seed_accounting_honduras.sql` | Seed payroll_concepts + RPC `accounting_seed_company_defaults(company_id)` |

## Uso

### Inicializar contabilidad para una empresa

```sql
SELECT accounting_seed_company_defaults('uuid-de-la-empresa');
```

Crea el catálogo NIIF por defecto y los mapeos contables para Honduras.

### INFOP por empresa

Usar `companies.settings->>'is_infop_liable' = 'true'` para indicar que la empresa aplica INFOP (1% planilla). No contar empleados dinámicamente.

```sql
UPDATE companies SET settings = settings || '{"is_infop_liable": true}'::jsonb WHERE id = '...';
```

## Fase 2 (Implementada)

- `lib/payroll/employer-contributions.ts` — IHSS patronal, RAP patronal, INFOP
- `lib/payroll/labor-provisions.ts` — 13°, 14°, vacaciones, cesantía
- `lib/payroll/statutory-deductions-compute.ts` — deducciones de ley por empleado
- `lib/accounting/payroll-statutory-trace.ts` — puente de trazabilidad planilla → asientos
- `lib/accounting/journal-generator.ts` — motor que genera asientos desde payroll_run
- `POST /api/accounting/generate-journal-entries` — genera asientos desde corrida autorizada
- `POST /api/accounting/seed-company-defaults` — inicializa catálogo y mapeos por empresa

### Trazabilidad (statutory-deductions-compute → journal-generator)

La cadena de auditoría une el cálculo fiscal de nómina con los asientos contables:

1. **Nómina** — `computePayrollEmployeeStatutoryDeductions` (vía `getTaxEngine`) calcula IHSS/RAP/ISR y persiste `eff_ihss`, `eff_rap`, `eff_isr`, `tax_year` en `payroll_run_lines`.
2. **Contabilidad** — `generateJournalEntriesFromPayrollRun` lee esos montos para la Partida 1 (retenciones) y carga el mismo contexto fiscal con `getTaxEngine('HND').loadYearContext(year)` para aportaciones patronales y provisiones.
3. **Persistencia** — `journal_entries.source_reference.statutory` guarda:
   - `trace`: origen de parámetros (`payroll_statutory_params`, `tax_brackets` o fallback)
   - `retention_totals`: suma de retenciones tomadas de la planilla
   - `payroll_line_tax_year`: año fiscal en líneas
   - `pipeline`: rutas de módulos en la cadena

La UI en la pestaña Contabilidad de nómina (`StatutoryTraceabilityPanel`) muestra este bloque al listar asientos.

### Flujo de uso

1. `POST /api/accounting/seed-company-defaults` con `{ company_id }` (una vez por empresa)
2. Asignar `departments.cost_center_type` (ventas, administracion, produccion)
3. Opcional: `companies.settings = { ...settings, is_infop_liable: true }`
4. Autorizar corrida de nómina
5. `POST /api/accounting/generate-journal-entries` con `{ run_id }`

## Referencia

Ver plan: `.cursor/plans/módulo_contable_nóminas_honduras_adee20d3.plan.md`
