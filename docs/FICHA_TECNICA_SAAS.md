# Ficha Técnica — SaaS HR / Nómina Honduras

**Versión:** 1.5.0  
**Fecha:** Febrero 2026  
**Producto:** Humano Sisu — Sistema de Gestión de Recursos Humanos y Nómina

---

## 1. Resumen Ejecutivo

SaaS multi-tenant para gestión de RRHH orientado al mercado hondureño. Cubre asistencia biométrica, nómina, reportes legales, permisos, gamificación y portal de empleados. Soporta dispositivos Hikvision para control de asistencia.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión |
|------|------------|---------|
| **Frontend** | Next.js | 15.5.x |
| **UI** | React 19, Tailwind CSS, MUI, Radix UI, Framer Motion | — |
| **Backend** | Next.js API Routes (Node.js) | — |
| **Base de datos** | PostgreSQL (Supabase) | 12.2+ |
| **Auth** | Supabase Auth (JWT, OAuth, SMS/Twilio) | — |
| **Email** | Resend, Nodemailer, SendGrid | — |
| **Colas** | BullMQ + Redis (ioredis) | — |
| **PDF** | PDFKit, ExcelJS | — |
| **Validación** | Zod | 4.x |
| **Lenguaje** | TypeScript | 5.8 |
| **Node** | >= 20.0.0 | — |

### 2.1 Infraestructura (por qué Railway + Supabase)

**Railway (deploy del SaaS)**

- **Menor carga operativa**: despliegue tipo PaaS (build + runtime) con entornos separados (staging/producción).
- **Seguridad a nivel plataforma** (según Railway): enforcement de 2FA, SSO SAML para equipos enterprise, RBAC y audit logs. Ver: `https://blog.railway.com/p/2fa-audit-logs-compliance`.
- **Operación simple**: variables de entorno gestionadas por environment, logs centralizados y health checks (ver `docs/RAILWAY_STAGING_SETUP.md`).

**Supabase (Postgres + plataforma de datos)**

- **Seguridad multi-tenant**: aislamiento por empresa con **Postgres RLS** (políticas por `company_id`) como línea base.
- **Auth integrado**: JWT/OAuth/OTP y soporte de **MFA**; claims en JWT (p.ej. `aal`) permiten endurecer reglas incluso en RLS. Ver: `https://supabase.com/docs/guides/auth/auth-mfa`.
- **Compliance**: Supabase documenta SOC 2 Type 2 y un modelo de responsabilidad compartida. Ver: `https://supabase.com/docs/guides/security/soc-2-compliance`.
- **Escalabilidad**: Supabase posiciona el uso de Postgres + connection pooling/read replicas/HA (según plan) para crecer sin re-arquitecturar. Ver: `https://supabase.com/solutions/b2b-saas`.

### Servicios auxiliares

| Servicio | Descripción |
|----------|-------------|
| **Hikvision (integración)** | SDK integrado + API routes en Next.js para comunicación directa con dispositivos y worker BullMQ para sincronización de empleados (ver `docs/ARQUITECTURA_INGESTA_ASISTENCIA.md`) |
| **Supabase Edge Functions** | create-user-profile, process-payroll (payroll-calculation se invoca desde b2c-dashboard pero puede ejecutarse en API routes) |

---

## 3. Arquitectura

### 3.1 Modelo multi-tenant

- **Tenant:** `companies` (empresa)
- **Aislamiento:** Row Level Security (RLS) en Supabase por `company_id`
- **Usuarios:** `user_profiles` → `organization_members` → `companies`

### 3.2 Capas de configuración (nómina y asistencia)

| Capa | Origen | Uso |
|------|--------|-----|
| **1** | `labor_laws` (país/año) | Valores legales por defecto (Honduras) |
| **2** | `company_payroll_configs`, `employees`, `work_schedules` | Configuración por empresa y empleado |
| **3** | `attendance_hours_calculation`, `payroll_run_lines`, `payroll_adjustments` | Resultados calculados y ajustes manuales |

**Regla:** Capa 3 > Capa 2 > Capa 1.

### 3.3 Despliegue

- **Producción / Staging:** Railway
- **Output:** Next.js `standalone`
- **Puerto:** 8080
- **Timezone:** America/Tegucigalpa
- **Moneda:** HNL

---

## 4. Módulos Principales

### 4.1 Asistencia

- **Marcas:** `attendance_events` (eventos crudos) → `attendance_records` (registros procesados)
- **Lógica Best Fit:** umbral 1.5 h (90 min) para coincidir con horario; webhook Hikvision usa ventana ±1 h para entrada/salida
- **Prevención duplicados:** ventana de 15 minutos
- **Horas:** `attendance_hours_calculation` (horas normales, extras diurnas/nocturnas/feriado)
- **Fuentes:** webhook Hikvision (`/api/webhooks/attendance`), registro manual

### 4.2 Nómina

- **Períodos:** quincenal, mensual, semanal
- **Cálculos:** IHSS, RAP, ISR (tablas `tax_brackets` por año)
- **13º y 14º salario:** Honduras
- **Séptimo día:** pago día de descanso
- **Horas extra:** diurnas +25%, nocturnas +50%, mixto/feriado +75%
- **Flujo:** draft → pre-authorize → authorize → PDF/vouchers

### 4.3 Empleados

- **CRUD:** empleados, departamentos, horarios (`work_schedules`)
- **Tipos de pago:** `fixed` (administrativo), `hourly` (por hora)
- **Archivos:** `employee_files` (storage Supabase)
- **Invitations:** `employee_invitations` con OTP/PIN para portal

### 4.4 Portal de empleados

- Autenticación: OTP (SMS) o PIN
- Consulta: asistencia, nómina (PDF), permisos
- Subida de archivos (según permisos)

### 4.5 Permisos y ausencias

- `leave_requests`, `leave_types`
- Flujo: solicitud → aprobación → integración con nómina

### 4.6 Reportes

- Asistencia, nómina, finiquito, certificaciones laborales
- Exportación: Excel, PDF

### 4.7 Gamificación

- `achievement_types`, `employee_achievements`, `employee_scores`
- Leaderboard, puntos por asistencia

### 4.8 Afiliados

- `affiliates`, `affiliate_requests`, `commissions`
- Códigos de referido, comisiones por conversión

### 4.9 Administración

- Super admin, gestión de empresas, usuarios, dispositivos
- Billing (PayPal), analytics, logs, auditoría

### 4.10 Trial

- Período de prueba configurable
- `trial_access_users`, `trial_conversions`, `activaciones`

---

## 5. Base de Datos (PostgreSQL / Supabase)

### 5.1 Tablas principales

| Dominio | Tablas |
|---------|--------|
| **Core** | companies, user_profiles, organization_members, departments |
| **Empleados** | employees, employee_aliases, employee_invitations, employee_files |
| **Asistencia** | attendance_events, attendance_records, attendance_stage |
| **Horarios** | work_schedules |
| **Nómina** | payroll_runs, payroll_run_lines, payroll_records, payroll_adjustments, payroll_uploads |
| **Legal** | labor_laws, tax_brackets |
| **Permisos** | leave_requests, leave_types |
| **Dispositivos** | devices |
| **Gamificación** | achievement_types, employee_achievements, employee_scores |
| **Afiliados** | affiliates, affiliate_requests, commissions |
| **Auditoría** | audit_logs, system_logs, job_executions |
| **Otros** | mail_list_subscriptions, activaciones, recursos |

### 5.2 Funciones RPC relevantes

- `attendance_employee_timeline`, `attendance_lists_filtered`, `attendance_kpis_filtered`
- `reports_attendance`, `reports_payroll`, `reports_calculate_severance`, `reports_work_certificate_data`
- `authenticate_employee`, `generate_employee_session_token`
- `get_labor_law_value`, `resolve_payment_frequency`
- `create_or_update_payroll_run`, `insert_payroll_line`

### 5.3 Seguridad

- RLS habilitado en tablas sensibles
- Políticas por `company_id` y rol
- `service_role` para operaciones administrativas

---

## 6. APIs (Next.js API Routes)

### 6.1 Rutas principales

| Área | Ejemplos |
|------|----------|
| **Auth** | `/api/auth/login-supabase`, `/api/auth/sessions/*`, `/api/auth/register-b2c` |
| **Empleados** | `/api/employees/*`, `/api/employees/me/*`, `/api/employees/auth/*` |
| **Asistencia** | `/api/attendance/*`, `/api/webhooks/attendance` |
| **Nómina** | `/api/payroll/*` (calculate, preview, generate-pdf, authorize, etc.) |
| **Reportes** | `/api/reports/*` |
| **Admin** | `/api/admin/*` (companies, users, devices, affiliates, billing, logs) |
| **Hikvision** | `/api/hikvision/provision`, `/api/hikvision/status/[deviceId]` |
| **Cron** | `/api/cron/daily`, `/api/cron/backup-critical-data`, `/api/cron/cleanup-*` |

### 6.2 Webhooks

- **Asistencia biométrica:** `POST /api/webhooks/attendance` (Hikvision / eventos de acceso)
- **PayPal:** pagos y suscripciones

---

## 7. Integraciones Externas

| Integración | Uso |
|-------------|-----|
| **Supabase** | Auth, DB, Storage, Realtime |
| **PayPal** | Pagos, suscripciones, webhooks |
| **Twilio** | SMS para OTP empleados |
| **Resend / SendGrid / Nodemailer** | Emails transaccionales |
| **Redis** | BullMQ, rate limiting, sesiones |
| **Google Analytics / GTM** | Analytics (opcional) |

---

## 8. Dispositivos Biométricos

| Marca | Protocolo | Endpoints |
|-------|-----------|-----------|
| **Hikvision** | ISAPI (SDK integrado) | `/api/admin/devices/*`, `/api/hikvision/*`, `POST /api/webhooks/attendance` |

---

## 9. Seguridad

- **Headers:** X-Frame-Options, X-Content-Type-Options, CSP, HSTS
- **Auth:** JWT (Supabase), sesiones, revocación
- **Empleados:** OTP/PIN con pepper, rate limiting
- **API:** guards (`lib/auth/api-guards.ts`), respuestas estandarizadas
- **Auditoría:** `audit_logs`, `system_logs`
- **Validación:** Zod, validación de archivos subidos

---

## 10. Legislación Honduras

- **IHSS:** techo, tasa empleado
- **RAP:** tasa
- **ISR:** tramos por año (`tax_brackets`)
- **Horas extra:** 25% diurno, 50% nocturno, 75% mixto/feriado
- **13º y 14º salario**
- **Séptimo día**
- **Feriados:** configurables en `labor_laws.holidays`

---

## 11. Variables de Entorno Críticas

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (backend) |
| `DATABASE_URL` | Conexión PostgreSQL |
| `JWT_SECRET`, `SUPABASE_JWT_SECRET` | JWT |
| `RESEND_API_KEY` | Email |
| `PAYPAL_*` | Pagos |
| `EMPLOYEE_LAST5_PEPPER`, `EMPLOYEE_PIN_PEPPER` | Seguridad empleados |
| `CRON_SECRET` | Cron jobs |
| `TZ`, `DEFAULT_TIMEZONE` | America/Tegucigalpa |

---

## 12. Estructura de Directorios Relevante

```
saas-proyecto/
├── components/          # UI (attendance, admin, reports, etc.)
├── lib/                # Lógica (auth, payroll, attendance, emails)
├── pages/
│   ├── app/            # Dashboard, empleados, nómina, reportes, admin
│   ├── api/            # API Routes
│   ├── employees/     # Portal empleados
│   ├── afiliados/     # Flujo afiliados
│   └── ...
├── supabase/
│   ├── migrations/    # SQL migrations
│   └── functions/     # Edge Functions
├── services/
│   └── hikvision-proxy/  # Worker BullMQ de sincronización de empleados (no es un proxy HTTP)
├── docs/              # Documentación
└── scripts/           # Utilidades, auditoría, staging
```

---

## 13. Scripts NPM

| Script | Descripción |
|--------|-------------|
| `dev` | Desarrollo Next.js |
| `build` | Build producción |
| `start` | Servidor producción |
| `audit` | Auditoría completa |
| `staging:setup` | Configuración Railway staging |
| `staging:deploy` | Deploy a staging |

---

## 14. Documentación Relacionada

- `README_LOGICA_ASISTENCIA.md` — Lógica de asistencia
- `docs/ONBOARDING_SAAS_POR_CAPAS.md` — Capas de configuración
- `docs/RAILWAY_STAGING_SETUP.md` — Staging en Railway
- `docs/ONBOARDING_ASISTENCIA_ACTUAL.md` — Proceso asistencia
- `docs/ARQUITECTURA_INGESTA_ASISTENCIA.md` — Flujo de ingesta y sincronización de dispositivos
- `docs/HIKVISION_CONNECTION_ANALYSIS.md` — Análisis de conectividad ISAPI
- `docs/HIKVISION_READINESS_CHECKLIST.md` — Checklist de preparación de dispositivos
