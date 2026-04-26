# Arquitectura: Exportar PDF de Reportes de Deducciones

## 1. Estudio del flujo actual de Payroll PDF

### 1.1 Flujo end-to-end

```
Frontend (DeduccionesManager / PayrollManager)
    │
    ├─► payrollApi.generatePDF(runId)
    │       └─► Retorna { url: `/api/payroll/generate-pdf-from-run?run_id=${runId}` }
    │
    ├─► link.href = url; link.click()
    │       └─► GET request con credentials (cookies de sesión)
    │
    └─► API: pages/api/payroll/generate-pdf-from-run.ts
            │
            ├─► requireCompanyAccess (auth)
            ├─► withExportRateLimit() (rate limiting)
            ├─► Fetch: payroll_runs, payroll_run_lines, employees
            ├─► Mapear a PlanillaItem[]
            ├─► generateConsolidatedPayrollPDF(...)  [lib/payroll/report.ts]
            │
            └─► res.setHeader('Content-Type', 'application/pdf')
                res.setHeader('Content-Disposition', 'attachment; filename=planilla_XXX.pdf')
                res.send(pdf)
```

### 1.2 Componentes clave

| Componente | Ubicación | Responsabilidad |
|------------|-----------|-----------------|
| **API Handler** | `pages/api/payroll/generate-pdf-from-run.ts` | Auth, fetch datos, llamar generador, enviar respuesta |
| **PDF Generator** | `lib/payroll/report.ts` | `generateConsolidatedPayrollPDF()` - PDFKit, Buffer |
| **Rate Limiting** | `lib/security/rate-limiting.ts` | `withExportRateLimit()` - 5 req/15 min |
| **Frontend API** | `lib/payroll-api.ts` | `generatePDF(runId)` → URL para download |
| **Frontend Trigger** | `usePayrollManager.ts` / `PayrollManagerNew` | Botón → link.click() con URL |

### 1.3 Patrón de respuesta PDF

```typescript
// Headers estándar
res.setHeader('Content-Type', 'application/pdf')
res.setHeader('Content-Disposition', `attachment; filename=${safeFilename}.pdf`)
return res.send(pdfBuffer)
```

### 1.4 Estructura del generador (lib/payroll/report.ts)

- **Input**: `PlanillaItem[]`, periodo, quincena, companyName, customFieldsConfig
- **Output**: `Promise<Buffer>`
- **Tecnología**: PDFKit (`require('pdfkit')`)
- **Estructura del documento**:
  1. Página 1: Header (rect azul), info período, resumen ejecutivo
  2. Páginas 2+: Tablas (fixed, hourly), columnas dinámicas
  3. Última: Detalle bancario

---

## 2. Arquitectura propuesta: Export PDF Reporte de Deducciones

### 2.1 Contexto de datos

El módulo **Deducciones** (`/app/deducciones`) muestra **planes de deducción** (`employee_deduction_plans`):

- Tipo de deducción (field_key)
- Empleado
- Activa (sí/no)
- Monto total
- Cuotas total / aplicadas / restantes
- Fecha inicio / fin

**Fuente de datos**: `GET /api/payroll/deduction-plans?company_id=X&include_inactive=true`

### 2.2 Flujo propuesto

```
Frontend (DeduccionesManager)
    │
    ├─► Botón "Exportar PDF"
    ├─► fetch('/api/payroll/deduction-plans-export-pdf?company_id=X', { credentials: 'include' })
    │       └─► GET con cookies
    │
    └─► API: pages/api/payroll/deduction-plans-export-pdf.ts
            │
            ├─► requireCompanyAccess
            ├─► withExportRateLimit()
            ├─► Fetch: employee_deduction_plans (con employees)
            ├─► generateDeductionPlansReportPDF(...)  [lib/payroll/deduction-plans-report.ts]
            │
            └─► res.setHeader(...)
                res.send(pdf)
```

### 2.3 Archivos a crear/modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `pages/api/payroll/deduction-plans-export-pdf.ts` | **Crear** | API GET, auth, fetch plans, llamar generador |
| `lib/payroll/deduction-plans-report.ts` | **Crear** | `generateDeductionPlansReportPDF(plans, companyName)` → Buffer |
| `components/DeduccionesManager.tsx` | **Modificar** | Botón "Exportar PDF", handler que hace fetch y descarga |

### 2.4 Estructura del PDF propuesta

**Página 1:**
- Header (rect azul #0b4fa1, coherente con payroll)
- Título: "Reporte de Planes de Deducción"
- Fecha generación, empresa
- Resumen: total planes, activos, inactivos, empleados únicos

**Página 2+:**
- Tabla con columnas:
  - Tipo deducción
  - Empleado (nombre/código)
  - Activa
  - Monto total
  - Cuotas total
  - Cuotas aplicadas
  - Cuotas restantes
  - Fecha inicio
  - Fecha fin

### 2.5 Interfaz del generador

```typescript
// lib/payroll/deduction-plans-report.ts

export interface DeductionPlanPDFItem {
  field_key: string
  field_label: string
  employee_name: string
  employee_code?: string
  activo: boolean
  monto_total: number
  plazos_totales: number
  plazos_aplicados: number
  plazos_restantes: number
  fecha_inicio: string
  fecha_fin: string | null
}

export async function generateDeductionPlansReportPDF(
  plans: DeductionPlanPDFItem[],
  companyName?: string,
  generatedByEmail?: string
): Promise<Buffer>
```

### 2.6 Coherencia con payroll

| Aspecto | Payroll | Deducciones (propuesto) |
|---------|---------|-------------------------|
| Auth | requireCompanyAccess | requireCompanyAccess |
| Roles | super_admin, company_admin, hr_manager | Igual |
| Rate limit | withExportRateLimit() | withExportRateLimit() |
| Header PDF | #0b4fa1, companyName | Igual |
| Formato moneda | L. X,XXX.XX | Igual |
| Filename | planilla_YYYY-MM_qN.pdf | reporte_deducciones_YYYY-MM-DD.pdf |

### 2.7 Descarga en frontend

```typescript
// Patrón (igual que payroll)
const handleExportPDF = async () => {
  const url = `/api/payroll/deduction-plans-export-pdf?company_id=${companyId}`
  const link = document.createElement('a')
  link.href = url
  link.download = `reporte_deducciones_${new Date().toISOString().split('T')[0]}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
```

**Nota**: Con GET + credentials, el navegador descarga directamente. Alternativa: `fetch(url, { credentials: 'include' })` + `blob()` + `URL.createObjectURL` si se necesita manejar errores antes de descargar.

---

## 3. Alternativa: Manejo de errores en descarga

Si se quiere mostrar toast de error cuando la API falla:

```typescript
const handleExportPDF = async () => {
  try {
    const res = await fetch(
      `/api/payroll/deduction-plans-export-pdf?company_id=${companyId}`,
      { credentials: 'include' }
    )
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error('Error', data.error || 'No se pudo generar el PDF')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `reporte_deducciones_${new Date().toISOString().split('T')[0]}.pdf`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Éxito', 'PDF descargado correctamente')
  } catch {
    toast.error('Error', 'Error de conexión')
  }
}
```

---

## 4. Resumen de implementación

1. **Crear** `lib/payroll/deduction-plans-report.ts` – generador PDF con PDFKit
2. **Crear** `pages/api/payroll/deduction-plans-export-pdf.ts` – API GET con auth + rate limit
3. **Modificar** `components/DeduccionesManager.tsx` – botón Exportar PDF + handler (opción con fetch + blob para mejor UX de errores)
