# EMPLOYEES — referencia de superficie

Leer desde `SKILL.md`. Código > `docs/FICHA_TECNICA_SAAS.md` §4.3–4.4.

## Tablas

| Tabla | Rol |
|-------|-----|
| `employees` | Master. Columnas vivas más completas que `lib/database.types.ts` |
| `employee_invitations` | Token email → password → Auth |
| `employee_files` | Metadata + Storage |
| `employee_salary_history` | Append-only deltas de `base_salary` |
| `employee_aliases` | Sin writers TS. Webhook usa `dni` |
| `employee_auth_sessions` / `_logs` / `_failed_attempts` | Tipadas; cleanup cron |

Fuera de ownership: `departments`, `work_schedules`, `employee_schedule_assignments`.

Columnas frecuentes: `company_id`, `department_id`, `work_schedule_id`, `employee_code`, `dni`, `name`, `email`, `phone`, `role`, `team`, `position`, `base_salary`, `hourly_rate_reference`, `hire_date`, `termination_date`, `termination_reason_code`, `termination_reason_detail`, `status`, bank/emergency/address, `metadata`, `payment_frequency`, `payment_day`, `quincena_config`, `pay_type`, `attendance_required`, `pay_overtime`, `sync_status`, `employee_pin_hash`, `is_b2c`.

Códigos de baja: `renuncia_voluntaria`, `despido_justificado`, `despido_injustificado`, `fin_contrato`, `mutuo_acuerdo`, `abandono_empleo`, `fallecimiento`, `jubilacion`, `otro` (`lib/employees/termination-reasons.ts`).

## Libs

| Path | Rol |
|------|-----|
| `lib/employees/termination-reasons.ts` | Allowlist baja |
| `lib/employees/salary-history.ts` | Insert historial |
| `lib/employees/enlace-employee-code.ts` | Código Enlace (company id en lib) |
| `lib/types/employee.ts` | Tipo canónico |
| `lib/security/shape-employee.ts` | ACL salario + allowlist write |
| `lib/employee-otp.ts` | OTP email in-memory |
| `lib/employee-portal/company-settings.ts` | Feature flag portal |
| `lib/queues/employeeSyncQueue.ts` | Encola Hikvision (noop sin Redis) |
| `lib/payroll/payroll-attendance-inclusion.ts` | Consumo flags × pay_type |
| `lib/payroll/resolve-effective-pay-type.ts` | Herencia pay_type |

## APIs

HR: `GET|POST /api/employees`, `POST /create`, `PUT|PATCH /update`, `GET /search`, `GET /list`. `[id]` es legacy.

Portal auth: `auth/login` (OTP email step1/2 → sesión; UI diaria = password via `/api/auth/login-supabase`), `send-otp`, `verify-otp`, `logout`.

Invitations: `invitations/accept`, `validate`. Send: `/api/admin/invitations/send`.

Files: `files/upload`, `files/[employeeId]`, `files/delete/[fileId]`.

`me/*`: index, attendance, payroll, payroll-pdf, permissions, permission-types, habits, performance-evaluations, leave-requests attendance-summary, dashboard. `debug-attendance` solo con diagnostics.

## UI

`pages/app/employees/index.tsx` (`EmployeeManager`), `invitations.tsx`, `pages/employees/portal.tsx`, `invitation.tsx`. `EmployeeLogin` OTP-only = deprecated.

## Flujos

**Create:** auth + quota `create_employee` → ACL salary → Enlace code override → dup `employee_code` → insert `sync_status=pending` → coerce `attendance_required` si hourly/admin_floor → salary history → `addEmployeeSyncJob`.

**Update/terminate:** `can_manage_employees` + company isolation → allowlist → `inactive` exige `termination_reason_code` → hourly/admin_floor fuerza `attendance_required=true` → salary delta + sync job.

**Invitation:** admin send → accept (password ≥8) → `auth.users` + `employee_id` en metadata. Login: password. Forgot: OTP email.

**Enlace code:** iniciales nombre + últimos 5 DNI; colisiones → más letras / sufijo.

## RPCs muertos (no usar como flujo)

`authenticate_employee`, `generate_employee_session_token` — tipados, cero callers TS. Peppers documentados, sin uso TS.

## Discrepancias docs

| Docs | Código |
|------|--------|
| §4.3 CRUD departamentos/horarios | Solo FKs |
| §4.4 OTP SMS / PIN / Twilio | OTP email/Resend; login password |
| pay_type fixed/hourly | También `admin_floor` + null |
| Ficha sin salary_history | Tabla + flujo reales |
| `database.types.ts` employees | Stale vs `lib/types/employee.ts` |

## Debug

1. Isolation `employees.company_id` vs session
2. Portal: `user_metadata.employee_id` / `user_profiles.employee_id`
3. OTP in-memory = flaky multi-instance
4. Sync: Redis + `sync_status` + hikvision-proxy
5. Attendance match: DNI normalizado
6. Payroll drift: `metadata.pay_type` / `base_salary_used` vs live
