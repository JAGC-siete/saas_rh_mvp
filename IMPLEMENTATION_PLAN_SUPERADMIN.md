# 📋 Plan Estratégico de Implementación - Super Admin Panel

## 🎯 Objetivo
Implementar acceso completo a tablas de prioridad ALTA y MEDIA en la UI del superadmin, respetando los patrones y configuraciones funcionales existentes.

---

## 📊 Análisis de Patrones Actuales

### Patrones Identificados:
1. **Estructura de Páginas:**
   - `SuperAdminGuard` + `SuperAdminLayout` wrapper
   - Head con título
   - Header con título, descripción y breadcrumb
   - `Card variant="glass"` para contenedores
   - Paginación con `page` y `pageSize`
   - Filtros con `search`, `role`, `state`
   - Loading states con skeleton cards
   - Error handling con `Card` de error

2. **Patrón de API:**
   - Endpoints en `/api/admin/[resource]`
   - Usa `requireSuperAdmin()` para auth
   - Usa `createAdminClient()` para queries
   - Paginación con `page` y `pageSize`
   - Filtros con query params
   - Respuesta: `{ success: true, data: [], metadata: { total, page, pageSize } }`

3. **Componentes UI:**
   - `Card`, `CardHeader`, `CardTitle`, `CardContent`
   - `Button` con variantes `outline`, `sm`
   - Inputs con estilo glass: `bg-white/10 backdrop-blur-sm border-white/20`
   - Badges para estados
   - Loading overlay con glass effect

---

## 🏗️ Arquitectura de Implementación

### Fase 1: Billing & Usage Tracking (ALTA PRIORIDAD)
**Objetivo:** Implementar gestión completa de facturación y uso

#### 1.1 Company Meters (`company_meters`)
**Ubicación:** `/app/admin/billing` → Tab "Uso Mensual"

**API Endpoint:** `/api/admin/billing/meters`
- GET: Listar meters con filtros (company_id, month, year)
- Filtros: company, month range, métrica específica

**UI Components:**
- Tabla con columnas: Company, Month, PDFs, Vouchers, Attendance, Employees, Total
- Filtros: Company selector, Month picker, Year selector
- Gráficos: Usage trends por métrica
- Export: CSV de usage data

**Dependencias:** Ninguna

---

#### 1.2 Manual Payments (`manual_payments`)
**Ubicación:** `/app/admin/billing` → Tab "Pagos Manuales"

**API Endpoint:** `/api/admin/billing/payments`
- GET: Listar pagos con filtros
- POST: Crear pago manual
- PATCH: Actualizar pago
- DELETE: Eliminar pago (soft delete)

**UI Components:**
- Tabla: Company, Amount, Reference, Paid At, Created By
- Form modal: Crear/editar pago
- Filtros: Company, Date range, Amount range
- Totalizador: Suma de pagos por período

**Dependencias:** Ninguna

---

### Fase 2: Payroll Analytics (ALTA PRIORIDAD)
**Objetivo:** Visualizar y gestionar ejecuciones de nómina

#### 2.1 Payroll Runs (`payroll_runs`)
**Ubicación:** `/app/admin/analytics` → Tab "Ejecuciones de Nómina"

**API Endpoint:** `/api/admin/analytics/payroll-runs`
- GET: Listar runs con filtros (company_id, period, status)
- GET /[id]: Detalle de run con líneas
- Filtros: Company, Period range, Status

**UI Components:**
- Tabla: Company, Period, Status, Total Employees, Gross, Net, Created At
- Detalle modal: Ver líneas de nómina
- Filtros: Company, Period, Status
- Gráficos: Payroll trends, Total payroll por mes

**Dependencias:** Ninguna

---

#### 2.2 Payroll Records (`payroll_records`)
**Ubicación:** `/app/admin/analytics` → Tab "Historial de Nómina"

**API Endpoint:** `/api/admin/analytics/payroll-records`
- GET: Listar records con filtros (company_id, employee_id, period)
- Filtros: Company, Employee, Period range

**UI Components:**
- Tabla: Employee, Company, Period, Gross, Deductions, Net, Status
- Filtros: Company, Employee, Period
- Export: CSV de payroll history

**Dependencias:** Ninguna

---

### Fase 3: Security & Sessions (ALTA PRIORIDAD)
**Objetivo:** Monitoreo de seguridad y sesiones activas

#### 3.1 Auth Sessions (`auth.sessions`)
**Ubicación:** `/app/admin/security` → Tab "Sesiones Activas"

**API Endpoint:** `/api/admin/security/sessions`
- GET: Listar sesiones activas
- DELETE: Revocar sesión
- Filtros: user_id, ip_address, date range

**UI Components:**
- Tabla: User Email, IP Address, User Agent, Created At, Last Activity
- Acciones: Revocar sesión
- Filtros: User, IP, Date range
- Estadísticas: Total sesiones activas, Sesiones por IP

**Dependencias:** Requiere acceso a `auth.users` para emails

---

#### 3.2 Job Executions (`job_executions`)
**Ubicación:** `/app/admin/system` → Tab "Jobs Programados"

**API Endpoint:** `/api/admin/system/jobs/executions`
- GET: Listar ejecuciones con filtros
- GET /[id]: Detalle de ejecución
- POST: Ejecutar job manualmente
- Filtros: job_name, status, date range

**UI Components:**
- Tabla: Job Name, Status, Started At, Completed At, Duration, Error
- Detalle modal: Ver logs de ejecución
- Filtros: Job name, Status, Date range
- Acciones: Re-ejecutar job, Ver logs

**Dependencias:** Ninguna (ya existe `/api/admin/jobs`)

---

### Fase 4: Analytics & Engagement (MEDIA PRIORIDAD)
**Objetivo:** Métricas de gamificación y engagement

#### 4.1 Employee Scores (`employee_scores`)
**Ubicación:** `/app/admin/analytics` → Tab "Gamificación"

**API Endpoint:** `/api/admin/analytics/gamification/scores`
- GET: Listar scores con filtros (company_id, min_points, level)
- Filtros: Company, Min points, Level

**UI Components:**
- Tabla: Employee, Company, Total Points, Level, Achievements Count
- Gráficos: Leaderboard, Points distribution
- Filtros: Company, Min points, Level

**Dependencias:** Ninguna

---

#### 4.2 Leave Requests (`leave_requests`)
**Ubicación:** `/app/admin/analytics` → Tab "Solicitudes de Permisos"

**API Endpoint:** `/api/admin/analytics/leave-requests`
- GET: Listar requests con filtros (company_id, status, date range)
- PATCH: Actualizar status (approve/reject)
- Filtros: Company, Status, Date range, Leave type

**UI Components:**
- Tabla: Employee, Company, Leave Type, Start Date, End Date, Days, Status
- Acciones: Aprobar/Rechazar (si tiene permisos)
- Filtros: Company, Status, Date range
- Estadísticas: Total requests, Approval rate, Days requested

**Dependencias:** Requiere `leave_types` para nombres

---

#### 4.3 Attendance Records (`attendance_records`)
**Ubicación:** `/app/admin/analytics` → Tab "Asistencia"

**API Endpoint:** `/api/admin/analytics/attendance`
- GET: Listar records con filtros (company_id, employee_id, date range)
- Filtros: Company, Employee, Date range, Status

**UI Components:**
- Tabla: Employee, Company, Date, Check In, Check Out, Late Minutes, Status
- Filtros: Company, Employee, Date range, Status
- Gráficos: Attendance rate, Punctuality trends
- Export: CSV de attendance

**Dependencias:** Ninguna

---

## 📐 Estructura de Archivos

```
pages/api/admin/
├── billing/
│   ├── meters.ts          # GET: Listar company_meters
│   └── payments.ts        # GET, POST, PATCH, DELETE: manual_payments
├── analytics/
│   ├── payroll-runs.ts    # GET: Listar payroll_runs
│   ├── payroll-records.ts # GET: Listar payroll_records
│   ├── gamification/
│   │   └── scores.ts      # GET: Listar employee_scores
│   ├── leave-requests.ts  # GET, PATCH: leave_requests
│   └── attendance.ts      # GET: attendance_records
└── security/
    └── sessions.ts        # GET, DELETE: auth.sessions

pages/app/admin/
├── billing.tsx            # Expandir con tabs: Uso, Pagos
├── analytics.tsx          # Expandir con tabs: Payroll, Gamificación, Permisos, Asistencia
├── security.tsx           # Expandir con tab: Sesiones
└── system.tsx             # Expandir con tab: Jobs
```

---

## 🔄 Orden de Implementación

### Sprint 1: Billing Foundation (Semana 1)
1. ✅ Crear `/api/admin/billing/meters`
2. ✅ Crear `/api/admin/billing/payments`
3. ✅ Expandir `/app/admin/billing.tsx` con tabs
4. ✅ Implementar tab "Uso Mensual" (company_meters)
5. ✅ Implementar tab "Pagos Manuales" (manual_payments)

**Criterios de Aceptación:**
- Ver usage mensual por empresa
- Crear/editar/eliminar pagos manuales
- Filtros funcionando
- Export a CSV

---

### Sprint 2: Payroll Analytics (Semana 2)
1. ✅ Crear `/api/admin/analytics/payroll-runs`
2. ✅ Crear `/api/admin/analytics/payroll-records`
3. ✅ Expandir `/app/admin/analytics.tsx` con tabs
4. ✅ Implementar tab "Ejecuciones de Nómina"
5. ✅ Implementar tab "Historial de Nómina"

**Criterios de Aceptación:**
- Ver ejecuciones de nómina por empresa
- Ver historial de nómina por empleado
- Filtros y búsqueda funcionando
- Gráficos de tendencias

---

### Sprint 3: Security & System (Semana 3)
1. ✅ Crear `/api/admin/security/sessions`
2. ✅ Expandir `/api/admin/system/jobs/executions` (si no existe)
3. ✅ Expandir `/app/admin/security.tsx` con tab "Sesiones"
4. ✅ Expandir `/app/admin/system.tsx` con tab "Jobs"

**Criterios de Aceptación:**
- Ver sesiones activas con detalles
- Revocar sesiones
- Ver ejecuciones de jobs
- Re-ejecutar jobs manualmente

---

### Sprint 4: Engagement Analytics (Semana 4)
1. ✅ Crear `/api/admin/analytics/gamification/scores`
2. ✅ Crear `/api/admin/analytics/leave-requests`
3. ✅ Crear `/api/admin/analytics/attendance`
4. ✅ Implementar tabs en analytics: Gamificación, Permisos, Asistencia

**Criterios de Aceptación:**
- Ver leaderboard de gamificación
- Ver solicitudes de permisos
- Ver registros de asistencia
- Filtros y export funcionando

---

## 🎨 Componentes Reutilizables a Crear

### 1. `AdminDataTable` Component
**Propósito:** Tabla reutilizable con paginación, filtros y acciones

**Props:**
```typescript
interface AdminDataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  loading: boolean
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
    onPageSizeChange: (size: number) => void
  }
  filters?: FilterConfig[]
  actions?: (row: T) => ReactNode
  onExport?: () => void
}
```

**Ubicación:** `components/admin/AdminDataTable.tsx`

---

### 2. `AdminFilterBar` Component
**Propósito:** Barra de filtros reutilizable

**Props:**
```typescript
interface AdminFilterBarProps {
  filters: FilterConfig[]
  values: Record<string, any>
  onChange: (filters: Record<string, any>) => void
  onReset: () => void
}
```

**Ubicación:** `components/admin/AdminFilterBar.tsx`

---

### 3. `AdminStatsCards` Component
**Propósito:** Cards de estadísticas reutilizables

**Props:**
```typescript
interface AdminStatsCardsProps {
  stats: {
    label: string
    value: string | number
    icon: LucideIcon
    trend?: { value: number; isPositive: boolean }
  }[]
}
```

**Ubicación:** `components/admin/AdminStatsCards.tsx`

---

## 🔧 Configuraciones a Respetar

### 1. Autenticación
- ✅ Usar `requireSuperAdmin()` en todos los endpoints
- ✅ Usar `createAdminClient()` para queries (bypass RLS)
- ✅ Mantener `SuperAdminGuard` en todas las páginas

### 2. Estilos
- ✅ Mantener `variant="glass"` en Cards
- ✅ Usar `bg-white/10 backdrop-blur-sm` en inputs
- ✅ Usar `border-white/20` para borders
- ✅ Mantener loading overlay con glass effect
- ✅ Usar colores consistentes: `text-white`, `text-white/70`, `text-white/60`

### 3. Patrones de Código
- ✅ Paginación: `page`, `pageSize`, `total`
- ✅ Filtros: query params en URL
- ✅ Loading states: skeleton cards o spinners
- ✅ Error handling: Cards de error con mensaje
- ✅ Notificaciones: `useNotificationContext`

### 4. Estructura de Respuestas API
```typescript
// Success
{
  success: true,
  data: T[],
  metadata?: {
    total: number
    page: number
    pageSize: number
  }
}

// Error
{
  success: false,
  error: string,
  message?: string
}
```

---

## 📝 Checklist de Implementación por Sprint

### Sprint 1: Billing
- [ ] API `/api/admin/billing/meters` (GET con filtros)
- [ ] API `/api/admin/billing/payments` (GET, POST, PATCH, DELETE)
- [ ] Componente `AdminDataTable`
- [ ] Componente `AdminFilterBar`
- [ ] Página `/app/admin/billing.tsx` con tabs
- [ ] Tab "Uso Mensual" con tabla y gráficos
- [ ] Tab "Pagos Manuales" con CRUD completo
- [ ] Tests de endpoints
- [ ] Documentación

### Sprint 2: Payroll Analytics
- [ ] API `/api/admin/analytics/payroll-runs`
- [ ] API `/api/admin/analytics/payroll-records`
- [ ] Componente `AdminStatsCards`
- [ ] Página `/app/admin/analytics.tsx` con tabs
- [ ] Tab "Ejecuciones de Nómina"
- [ ] Tab "Historial de Nómina"
- [ ] Gráficos de tendencias
- [ ] Export a CSV

### Sprint 3: Security & System
- [ ] API `/api/admin/security/sessions`
- [ ] Expandir `/api/admin/system/jobs/executions`
- [ ] Página `/app/admin/security.tsx` con tab "Sesiones"
- [ ] Página `/app/admin/system.tsx` con tab "Jobs"
- [ ] Funcionalidad de revocar sesiones
- [ ] Funcionalidad de re-ejecutar jobs

### Sprint 4: Engagement Analytics
- [ ] API `/api/admin/analytics/gamification/scores`
- [ ] API `/api/admin/analytics/leave-requests`
- [ ] API `/api/admin/analytics/attendance`
- [ ] Tabs en analytics: Gamificación, Permisos, Asistencia
- [ ] Leaderboard de gamificación
- [ ] Gráficos de engagement

---

## 🚀 Consideraciones Técnicas

### Performance
- ✅ Paginación en servidor (no cargar todo)
- ✅ Lazy loading de datos pesados
- ✅ Caché de queries frecuentes (opcional)
- ✅ Debounce en filtros de búsqueda

### Seguridad
- ✅ Validar todos los inputs
- ✅ Sanitizar datos antes de mostrar
- ✅ Rate limiting en endpoints sensibles
- ✅ Logging de acciones críticas

### UX
- ✅ Loading states claros
- ✅ Mensajes de error descriptivos
- ✅ Confirmaciones para acciones destructivas
- ✅ Feedback inmediato en acciones

---

## 📊 Métricas de Éxito

### Funcionalidad
- ✅ 100% de tablas de alta prioridad implementadas
- ✅ 100% de tablas de media prioridad implementadas
- ✅ Todos los endpoints con autenticación correcta
- ✅ Filtros y búsqueda funcionando en todas las tablas

### Calidad
- ✅ Cero errores de linting
- ✅ Código siguiendo patrones existentes
- ✅ Componentes reutilizables creados
- ✅ Documentación completa

### Performance
- ✅ Tiempo de carga < 2s para listas
- ✅ Paginación funcionando correctamente
- ✅ Sin memory leaks

---

## 🔄 Próximos Pasos Inmediatos

1. **Crear componentes base reutilizables** (AdminDataTable, AdminFilterBar)
2. **Implementar Sprint 1** (Billing)
3. **Testing y refinamiento**
4. **Continuar con Sprints siguientes**

---

## 📚 Referencias

- Patrón de `pages/app/admin/users.tsx` para estructura
- Patrón de `pages/app/admin/companies.tsx` para paginación
- Patrón de `pages/api/admin/users.ts` para endpoints
- Estilos de `components/ui/card.tsx` y `components/ui/button.tsx`

