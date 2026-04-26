# Documentación del SaaS (fuente de verdad)

Este directorio contiene la documentación relevante y vigente del proyecto. Si encuentras documentos que se contradicen, **prioriza los enlazados en este índice**.

## Producto / Arquitectura

- **Ficha técnica (visión general, módulos, stack, env vars)**: `docs/FICHA_TECNICA_SAAS.md`
- **Onboarding por capas (legal → empresa/empleado → cálculo/ajustes)**: `docs/ONBOARDING_SAAS_POR_CAPAS.md`
- **Arquitectura de asistencia (3 capas)**: `docs/ARQUITECTURA_ASISTENCIA_3_CAPAS.md`

## Deploy / Staging / Operación

- **Staging en Railway (guía completa)**: `docs/RAILWAY_STAGING_SETUP.md`
- **Staging en Railway (rápido)**: `STAGING_QUICK_START.md`
- **CI/CD (estado y gaps)**: `docs/CI_CD_STATUS_REPORT.md` y `docs/RESUMEN_CI_CD.md`
- **Config issues (riesgos conocidos en env/config)**: `docs/CRITICAL_CONFIG_ISSUES.md`

## Seguridad (API / RLS / Auditoría)

- **Estandarización de seguridad en API routes**: `docs/API_SECURITY_STANDARDIZATION.md`
- **Orden de ejecución RLS para Storage (`employee_files`)**: `docs/SUPABASE_RLS_STORAGE_RUN_ORDER.md`

## Hikvision (biométricos)

- **Implementación actual (integrado en Next.js)**: `docs/HIKVISION_PROXY_INTEGRATED.md`
- **Resumen de integración**: `docs/INTEGRATION_SUMMARY.md`
- **Análisis de opciones en Railway (histórico, pero alineado con integración)**: `docs/RAILWAY_INTEGRATION_ANALYSIS.md`

## Reportes / análisis históricos

Estos documentos son útiles como contexto (incidentes, post-mortems, timelines) pero no siempre describen el “estado actual”.

- `docs/*_ANALYSIS.md`
- `docs/*_STATUS_REPORT.md`
- `docs/*TROUBLESHOOTING*.md`

## Documentos removidos por estar desfasados

Se eliminaron guías que asumían un **proxy Hikvision separado** y `HIKVISION_PROXY_URL`:

- `docs/HIKVISION_PROXY_SETUP.md`
- `docs/HIKVISION_PROXY_RAILWAY_STATUS.md`
- `docs/DEPLOY_PROXY_RENDER.md`
- `docs/DEPLOYMENT_QUICK_START.md`
- `scripts/deploy-hikvision-proxy.sh`

