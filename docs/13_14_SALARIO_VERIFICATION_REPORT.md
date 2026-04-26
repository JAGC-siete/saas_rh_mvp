# Verificación Módulo 13 & 14 Salario

**Fecha:** 2026-02-25

## Resumen

Auditoría de UI, middle y backend del módulo 13 & 14 Salario. Se identificaron y corrigieron 3 underconfigurations.

---

## 1. UI (Frontend)

### ✅ Configuración correcta
| Componente | Estado | Notas |
|------------|--------|-------|
| `DashboardLayout` | OK | GiftIcon importado, item entre Nómina y Parametros, permission: 'payroll' |
| `pages/app/13-14-salario/index.tsx` | OK | ProtectedRoute, DashboardLayout, dynamic import |
| `ThirteenthFourteenthManager` | OK | useCompanyContext, use1314SalarioManager, selectores año/tipo |
| `use1314SalarioManager` | OK | Estado year/tipo/data/loading/error, fetchPreview con credentials |

### Corrección aplicada
- **use1314SalarioManager**: Añadido `credentials: 'include'` al fetch para asegurar envío de cookies de sesión en requests cross-origin.

---

## 2. Middle (API / Middleware)

### ✅ Configuración correcta
| Aspecto | Estado | Notas |
|---------|--------|-------|
| `requireCompanyAccess` | OK | Autenticación estándar, valida sesión y company_id |
| Validación query params | OK | year, tipo requeridos; tipo in ['13AVO','14AVO'] |
| Método HTTP | OK | Solo GET aceptado |
| Respuesta JSON | OK | Estructura { rows, year, tipo } |

### Correcciones aplicadas
1. **middleware.config.ts**: Añadido `/app/13-14-salario` a `protection.authenticated` para consistencia con payroll y otras rutas protegidas.
2. **Rate limiting**: Añadido `withGeneralRateLimit(['GET'])(handler)` al endpoint preview (igual que payroll/preview).

### Nota sobre middleware.ts
- `middleware.ts` solo matchea `/api/debug/:path*` — no afecta rutas de app ni `/api/13-14-salario`.
- La protección de `/app/*` se hace con `ProtectedRoute` a nivel de componente.
- `middleware.config.ts` se usa para documentación y helpers; no hay middleware activo que bloquee rutas según esta config.

---

## 3. Backend (Base de datos / Auth)

### ✅ Configuración correcta
| Aspecto | Estado | Notas |
|---------|--------|-------|
| RLS employees | OK | Query usa company_id + status='active', respeta RLS con sesión |
| requireCompanyAccess | OK | Usa createClient(req,res) con cookies; admin client para user_profiles |
| Super admin | OK | Sin company_id devuelve 400 "Company ID is required" — comportamiento esperado |

### Sin cambios requeridos
- No hay políticas RLS específicas para 13-14; se reutilizan employees y user_profiles.
- El endpoint no escribe en BD (solo preview); no hay riesgo de escritura no autorizada.

---

## Checklist final

| Capa | Item | Estado |
|------|------|--------|
| UI | Navegación visible con permiso payroll | ✅ |
| UI | Página protegida con ProtectedRoute | ✅ |
| UI | Fetch con credentials para sesión | ✅ (corregido) |
| API | Autenticación requireCompanyAccess | ✅ |
| API | Rate limiting | ✅ (corregido) |
| API | Validación year/tipo | ✅ |
| Config | middleware.config authenticated | ✅ (corregido) |
| Auth | companyId requerido | ✅ |

---

## Próximos pasos (fases futuras)

- Implementar lógica real de cálculo (promedio 12 meses, días trabajados).
- Crear migración para extender CHECK de payroll_runs.tipo a 13AVO/14AVO.
- Endpoint POST /api/13-14-salario/calculate para persistir corridas.
