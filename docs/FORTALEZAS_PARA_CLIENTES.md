# Fortalezas del SaaS (para clientes y usuarios)

Este documento resume fortalezas relevantes para clientes (seguridad, escalabilidad, operación) y cómo se reflejan en el producto.

## Seguridad

### Aislamiento multi-tenant (empresa/tenant)

- **Base de seguridad**: el modelo es multi-tenant y el aislamiento de datos se apoya en **Row Level Security (RLS) en Postgres/Supabase** por `company_id`.
- **Beneficio para el cliente**: reduce el riesgo de fuga accidental entre empresas y hace más auditable el control de acceso (políticas en base de datos).

### Autenticación y control de acceso

- **Supabase Auth**: JWT/OAuth/OTP; soporte de **MFA** (TOTP/SMS) y posibilidad de exigirlo por políticas.
- **Aplicación**: guards de API, roles y auditoría (ver `docs/API_SECURITY_STANDARDIZATION.md`).

### Auditoría y trazabilidad

- **Nivel aplicación**: `audit_logs` / `system_logs` (según módulo).
- **Nivel plataforma (Railway)**: Railway documenta RBAC + audit logs para cambios operativos y de workspace (2FA/SSO/Roles/Audit). Fuente: `https://blog.railway.com/p/2fa-audit-logs-compliance`.

### “Shared responsibility model”

- Aunque el proveedor cubre controles de plataforma (p.ej. SOC 2 en Supabase), **la configuración correcta del SaaS** (políticas RLS, permisos, rotación de secrets, etc.) es parte del alcance del proyecto. Fuente Supabase: `https://supabase.com/docs/guides/security/soc-2-compliance`.

## Escalabilidad

### Escalabilidad de la aplicación (Railway)

- **Modelo PaaS**: facilita crecer sin administrar infraestructura base (deploy, entornos, variables, logs).
- **Separación de entornos**: staging/producción para reducir riesgo en cambios y permitir validación previa (ver `docs/RAILWAY_STAGING_SETUP.md`).

### Escalabilidad de datos (Supabase / Postgres)

- **Postgres como core**: permite crecer por diseño (índices, particionado, triggers, funciones, JSONB).
- **Estrategias típicas**: connection pooling, read replicas y HA (según plan) para cargas crecientes. Referencia: `https://supabase.com/solutions/b2b-saas`.

## Operación y confiabilidad

- **Backups/recuperación**: Supabase ofrece backups/recuperación (según plan). Referencia: `https://supabase.com/solutions/b2b-saas`.
- **Health checks**: el SaaS expone endpoints (p.ej. `/api/health`) y la guía de Railway documenta verificación post-deploy. Ver `docs/RAILWAY_STAGING_SETUP.md`.
- **Diagnóstico**: documentos de troubleshooting y post-mortems existen en `docs/` para problemas conocidos (p.ej. 502, integraciones, etc.).

## Fortalezas funcionales (lo que le importa al cliente)

- **Cumplimiento local (Honduras)**: cálculos de IHSS/RAP/ISR, 13º/14º, séptimo día, overtime diurno/nocturno/feriado (ver `docs/FICHA_TECNICA_SAAS.md`).
- **Asistencia biométrica**: integración Hikvision vía SDK/API routes y webhooks (ver `docs/HIKVISION_PROXY_INTEGRATED.md`).
- **Modelo por capas**: configuración legal → empresa/empleado → cálculo/ajustes facilita onboarding y operación (ver `docs/ONBOARDING_SAAS_POR_CAPAS.md`).

## Cómo presentar esto en ventas (mensajes sugeridos)

- **Seguridad**: “Aislamiento por empresa a nivel base de datos (RLS) + controles de acceso y auditoría en APIs”.
- **Escalabilidad**: “Arquitectura Postgres-first con opciones estándar para crecer; operación simplificada con PaaS”.
- **Confiabilidad**: “Entornos separados, health checks, y prácticas de recuperación/operación documentadas”.

