# Humano SISU Bridge (Odoo 18 / 19)

Addon privado: SISU es sistema de registro de RH/nómina. Odoo recibe fichas de empleado y asientos de planilla en **draft**. No instala `hr.payroll`.

**Instalación para el partner:** [INSTALL.md](INSTALL.md)

## Spike DNI (Odoo 19)

Código `odoo/odoo` 19.0 (`addons/hr/models/hr_employee.py`):

- `hr.employee` declara `_inherits = {'hr.version': 'version_id'}`.
- `identification_id` vive en `hr.version` (Identification No).
- Escritura de `identification_id` en `hr.employee.create` / `write` se delega a la versión heredada.
- El módulo 19.0 además escribe en `employee.version_id` si existe, por si el related no persiste en un tenant custom.

En Odoo 18.0 `identification_id` es campo directo de `hr.employee`.

## Contrato RPC

Modelo `humano.sisu.bridge` (transient):

| Método | Entrada mínima | Salida |
|--------|----------------|--------|
| `upsert_employee` | `sisu_id`, `name` (+ DNI, email, active, company_id) | `{odoo_id, partner_id}` |
| `import_payroll_move` | `sisu_journal_entry_id`, `journal_code`, `lines[]` | `{odoo_move_id, state}` |

Asiento: `move_type=entry`, diario **miscellaneous** (`type=general`), estado **draft**. Idempotente por `sisu_journal_entry_id`.

Grupo bot: Employees Officer + Show Full Accounting Features. En 19 el grupo usa `privilege_id` (no `category_id`) y `api_key_duration=90`.

Operación SISU: [docs/ODOO_INTEGRATION_RUNBOOK.md](../docs/ODOO_INTEGRATION_RUNBOOK.md).

Dependencias: `hr`, `account`. No `hr_payroll` ni `account_accountant`.
