---
name: employees
description: >-
  Protocolo canónico del módulo EMPLOYEES (identidad contractual, master data,
  portal, archivos, salary history). Use when working on employees CRUD, portal
  auth, invitations, employee_files, pay_type, attendance_required, base_salary,
  employee_code, dni, termination, or files under lib/employees/, pages/api/employees/,
  pages/app/employees/, pages/employees/, components/Employee*. Do not use for
  work_schedules CRUD, AHC/hours, or payroll calculation.
---

# EMPLOYEES

Cargar este skill **antes** de leer, nombrar o modificar código del módulo. Código > docs. Si el cambio cruza asistencia u horas/nómina, cargar también `attendance` o `payroll`; no fusionar dominios.

Detalle de superficie: [reference.md](reference.md).

## Frontera

**Entra:** CRUD HR, portal (auth + self-service), invitaciones, `employee_files`, `employee_salary_history`, códigos Enlace, flags contractuales (`pay_type`, `attendance_required`, `pay_overtime`, `payment_frequency`).

**No entra:** CRUD `departments` / `work_schedules`; asignaciones temporales (`employee_schedule_assignments`); cálculo de horas/AHC; motor IHSS/ISR/RAP/séptimo; provision ISAPI (solo enqueue `employee-sync`).

Regla: EMPLOYEES = identidad + master data. Horario físico y engines viven en otros módulos. Empleados solo guardan FKs (`department_id`, `work_schedule_id`).

## Vocabulario

| Término | Concepto |
|---------|----------|
| `employees` | Master multi-tenant (`company_id`) |
| `dni` | Identidad legal + match webhook (no `employee_aliases`) |
| `employee_code` | UNIQUE `(company_id, employee_code)` |
| `pay_type` | `fixed` \| `hourly` \| `admin_floor` \| `null` (hereda `calculation_mode`) |
| `base_salary` | **Mensual** siempre; `hourly_rate_reference` = `base_salary/240` |
| `attendance_required` | Default `true`. `false` solo tiene sentido en `fixed` |
| `status` | API viva: `active` / `inactive` (+ `termination_reason_*`) |
| OTP portal | Código 6 dígitos por **email** (Resend), no SMS |

Tipos canónicos: `lib/types/employee.ts` (más actual que `lib/database.types.ts`).

## Entrada de código

1. `lib/types/employee.ts`, `lib/security/shape-employee.ts`
2. `pages/api/employees/create.ts`, `pages/api/employees/update.ts`
3. `lib/employees/*`, `lib/payroll/resolve-effective-pay-type.ts` (consumo, no ownership)
4. Portal: `pages/api/employees/me/*`, `pages/api/employees/auth/*`

Preferir `update.ts` sobre `pages/api/employees/[id].ts`. Send de invitaciones: `/api/admin/invitations/send`, no employees API.

## Invariantes

- Tenant: filtrar `company_id`; allowlist de write (`EMPLOYEE_WRITE_ALLOWLIST` / `shape-employee`).
- UNIQUE `(company_id, dni)` y `(company_id, employee_code)`.
- `hourly` / `admin_floor` ⇒ `attendance_required = true` (create/update).
- Portal: `employee_portal_enabled`; **nunca** exponer `base_salary` sin mask en `me/*`.
- Login diario = email+password (`EmployeePasswordLogin`). OTP email = forgot/recovery.
- No loguear OTP/PIN. No hardcodear peppers (`EMPLOYEE_LAST5_PEPPER`, `EMPLOYEE_PIN_PEPPER`).

## Contratos

**Attendance consume:** `id`, `dni`, `status`, `company_id`, `work_schedule_id`, `pay_type`, `attendance_required`.

**Payroll consume:** `base_salary`, `pay_type`, `attendance_required`, `pay_overtime`, `payment_frequency`, bank, codes/name/dni. Statutory **no** sale de employees.

**EMPLOYEES no calcula** horas, late, overtime amounts, IHSS, ISR, RAP, séptimo.

## Anti-patrones

- Tratar `work_schedules` o departments como submódulo employees.
- Asumir OTP SMS / Twilio / PIN RPC (`authenticate_employee` no tiene callers TS).
- Usar `employee_aliases` (tabla viva, app muerta; webhook matchea DNI).
- Meter lógica de horas o statutory en `lib/employees`.
- Queue sync: usar `lib/queues/employeeSyncQueue.ts`, no el duplicado `lib/queue/employeeSync.ts`.
- Status `terminated` en flujos API: usar `inactive` + `termination_reason_code`.

## Workflow de cambio

**Campo nuevo en `employees`:** migration → allowlist `update.ts` + `shape-employee.ts` → `create.ts` → `lib/types/employee.ts` → UI `EmployeeManager` / `AddEmployeeForm` → consumidores en **attendance/payroll**, no recálculo aquí.

**Endpoint HR:** `requireCompanyAccess` / `can_manage_employees` + `shapeEmployee`.

**Endpoint portal:** `me/` + `resolveEmployeeAndCompanyId` + `assertEmployeePortalEnabled`.
