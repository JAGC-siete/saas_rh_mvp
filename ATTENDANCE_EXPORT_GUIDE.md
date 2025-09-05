# 📊 Guía de Exportación de Asistencia

## 🎯 Descripción General

Sistema de exportación de datos de asistencia que mantiene la misma calidad visual y funcional que el sistema de payroll existente. Incluye exportación a Excel y PDF con formato corporativo profesional.

## 📁 Archivos Creados

### 1. `/lib/attendance/report.ts` - Librería de Generación PDF
- **Formato:** 3 páginas (Resumen ejecutivo, tabla de asistencia, análisis por departamento)
- **Colores:** Corporativos consistentes con payroll (`#1e40af`)
- **Cálculos:** Automáticos de métricas (tasas, promedios, totales)
- **Interfaz:** `AttendanceItem` y `AttendanceSummary`

### 2. `/pages/api/attendance/export.ts` - Endpoint Excel
- **Hojas:** 2 hojas (Asistencia detallada y Resumen)
- **Columnas:** 17 columnas con datos completos
- **Estilos:** Consistentes con payroll (gris claro `#E0E0E0`)
- **Formato:** `.xlsx` con ancho de columnas optimizado

### 3. `/pages/api/attendance/generate-pdf.ts` - Endpoint PDF
- **Páginas:** 3 páginas con formato corporativo
- **Análisis:** Completo por departamento
- **Métricas:** Calculadas automáticamente
- **Formato:** `.pdf` con branding Paragon Honduras

## 🚀 Uso de los Endpoints

### Exportación Excel
```javascript
// POST /api/attendance/export
const response = await fetch('/api/attendance/export', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    formato: 'excel',
    employee_id: 'optional' // Opcional para filtrar por empleado
  })
})

const blob = await response.blob()
// Descargar archivo Excel
```

### Generación PDF
```javascript
// POST /api/attendance/generate-pdf
const response = await fetch('/api/attendance/generate-pdf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    employee_id: 'optional' // Opcional para filtrar por empleado
  })
})

const blob = await response.blob()
// Descargar archivo PDF
```

## 📋 Especificaciones de Formato

### Excel - Hoja "Asistencia"
| Columna | Ancho | Descripción |
|---------|-------|-------------|
| Código | 12 | Código del empleado |
| Nombre | 25 | Nombre completo |
| Departamento | 15 | Departamento |
| Posición | 20 | Cargo/Posición |
| Fecha | 12 | Fecha del registro |
| Día de la Semana | 15 | Día de la semana |
| Hora de Entrada | 12 | Hora de check-in |
| Hora de Salida | 12 | Hora de check-out |
| Horas Trabajadas | 12 | Horas calculadas |
| Estado | 10 | Presente/Tardanza/Ausente |
| Minutos de Tardanza | 15 | Minutos de retraso |
| Horas Extra | 12 | Horas adicionales |
| Justificación | 30 | Notas/Justificación |
| Categoría Justificación | 20 | Tipo de justificación |
| Ubicación | 20 | Coordenadas GPS |
| Dispositivo | 15 | ID del dispositivo |
| Registrado | 12 | Fecha de registro |

### Excel - Hoja "Resumen"
| Concepto | Valor |
|----------|-------|
| Total Registros | Número total |
| Total Horas Trabajadas | Suma de horas |
| Total Minutos de Tardanza | Suma de retrasos |
| Total Horas Extra | Suma de horas extra |
| Registros Presentes | Conteo |
| Registros con Tardanza | Conteo |
| Registros Ausentes | Conteo |
| Tasa de Asistencia | Porcentaje |
| Tasa de Puntualidad | Porcentaje |
| Promedio Horas por Día | Promedio |

### PDF - Página 1: Resumen Ejecutivo
- **Header:** Paragon Honduras con colores corporativos
- **Información:** Empresa, período, generación
- **Métricas:** Total empleados, días, horas, tasas
- **Totales por Departamento:** Resumen compacto

### PDF - Página 2: Tabla de Asistencia
- **Encabezados:** 10 columnas principales
- **Datos:** Registros detallados por empleado
- **Paginación:** Automática para grandes volúmenes
- **Totales:** Fila de resumen al final

### PDF - Página 3: Análisis por Departamento
- **Tabla:** 5 columnas de análisis
- **Métricas:** Registros, horas, promedios, tasas
- **Notas:** Métricas clave y observaciones

## 🔐 Autenticación y Permisos

### Permisos Requeridos
- `can_view_reports`: Para acceder a reportes
- `can_export_payroll`: Para exportar datos

### Validaciones
- ✅ Usuario autenticado
- ✅ Perfil de usuario válido
- ✅ Fechas en formato YYYY-MM-DD
- ✅ Filtro por empresa (RLS)
- ✅ Filtro opcional por empleado

## 🎨 Consistencia Visual

### Colores Corporativos
- **Azul Principal:** `#1e40af` (headers, títulos)
- **Gris Claro:** `#E0E0E0` (headers Excel)
- **Gris Fondo:** `#f3f4f6` (totales PDF)

### Tipografías
- **Títulos:** 14-24px, bold
- **Encabezados:** 8-10px, bold
- **Datos:** 7-9px, normal
- **Totales:** 9px, bold

### Espaciado
- **Márgenes:** 30px (PDF)
- **Altura de filas:** 15px
- **Espaciado entre elementos:** 5-20px

## 📊 Cálculos Automáticos

### Métricas de Asistencia
- **Tasa de Asistencia:** (Presentes + Tardanzas) / Total × 100
- **Tasa de Puntualidad:** Presentes / Total × 100
- **Promedio Horas/Día:** Total Horas / Total Registros

### Cálculos por Empleado
- **Horas Trabajadas:** Check-out - Check-in
- **Tardanza:** Check-in después de 8:00 AM
- **Horas Extra:** Máximo(0, Horas Trabajadas - 8)

### Cálculos por Departamento
- **Registros Totales:** Conteo por departamento
- **Horas Totales:** Suma de horas por departamento
- **Promedio por Día:** Horas Totales / Registros
- **Tasa de Asistencia:** Por departamento

## 🔧 Integración Frontend

### Ejemplo de Uso en React
```jsx
const handleExportExcel = async () => {
  try {
    const response = await fetch('/api/attendance/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: selectedStartDate,
        endDate: selectedEndDate,
        formato: 'excel'
      })
    })
    
    if (response.ok) {
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `asistencia_${selectedStartDate}_${selectedEndDate}.xlsx`
      a.click()
    }
  } catch (error) {
    console.error('Error exportando Excel:', error)
  }
}
```

## ✅ Estado de Implementación

- ✅ **Librería PDF:** Completamente funcional
- ✅ **Endpoint Excel:** Completamente funcional  
- ✅ **Endpoint PDF:** Completamente funcional
- ✅ **Autenticación:** Integrada con sistema existente
- ✅ **Validaciones:** Fechas y permisos
- ✅ **Compilación:** Sin errores TypeScript
- ✅ **Build:** Exitoso en producción
- ⏳ **Integración Frontend:** Pendiente de implementar en AttendanceManager.tsx

## 🚀 Próximos Pasos

1. **Integrar en AttendanceManager.tsx** - Agregar botones de exportación
2. **Pruebas de Usuario** - Validar funcionalidad completa
3. **Optimizaciones** - Mejoras de rendimiento si es necesario
4. **Documentación** - Guía de usuario final

---

**Nota:** Todos los archivos mantienen la misma calidad visual y funcional que el sistema de payroll existente, asegurando consistencia en la experiencia del usuario.
