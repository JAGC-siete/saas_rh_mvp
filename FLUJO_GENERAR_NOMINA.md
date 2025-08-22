# 🔄 Flujo Completo: "Generar Nómina"

## 📋 **Resumen del Proceso**

Cuando se presiona el botón **"Generar Nómina"** en la interfaz web, ocurre el siguiente flujo completo:

---

## 🎯 **PASO 1: Interfaz de Usuario (PayrollManager.tsx)**

### **Ubicación:** `/components/PayrollManager.tsx`

```typescript
// Usuario llena el formulario:
{
  periodo: "2025-01",        // Mes (YYYY-MM)
  quincena: 1,               // 1 o 2
  incluirDeducciones: false  // Checkbox opcional
}

// Al presionar "Generar Nómina":
const generatePayroll = async (e: React.FormEvent) => {
  e.preventDefault()
  
  const response = await fetch('/api/payroll/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(generateForm),
  })
}
```

---

## 🔐 **PASO 2: Autenticación y Autorización**

### **Endpoint:** `POST /api/payroll/calculate`

```typescript
// 1. Verificar que el usuario esté autenticado
const { data: { user }, error: authError } = await supabase.auth.getUser()
if (authError || !user) {
  return res.status(401).json({ error: 'Unauthorized' })
}

// 2. Verificar permisos del usuario
const { data: userProfile } = await supabase
  .from('user_profiles')
  .select('role, company_id')
  .eq('id', user.id)
  .single()

// Solo estos roles pueden generar nómina:
if (!['company_admin', 'hr_manager', 'super_admin'].includes(userProfile.role)) {
  return res.status(403).json({ error: 'Insufficient permissions' })
}
```

---

## 📊 **PASO 3: Validación de Parámetros**

```typescript
const { periodo, quincena, incluirDeducciones } = req.body

// Validar formato del periodo (YYYY-MM)
if (!/^\d{4}-\d{2}$/.test(periodo)) {
  return res.status(400).json({ error: 'Periodo inválido (YYYY-MM)' })
}

// Validar quincena (1 o 2)
if (![1, 2].includes(quincena)) {
  return res.status(400).json({ error: 'Quincena inválida (1 o 2)' })
}

// Calcular fechas del período
const [year, month] = periodo.split('-').map(Number)
const ultimoDia = new Date(year, month, 0).getDate()
const fechaInicio = quincena === 1 ? `${periodo}-01` : `${periodo}-16`
const fechaFin = quincena === 1 ? `${periodo}-15` : `${periodo}-${ultimoDia}`
```

---

## 👥 **PASO 4: Obtener Datos de Empleados**

```typescript
// Obtener empleados activos de la empresa
const { data: employees, error: empError } = await supabase
  .from('employees')
  .select('id, name, dni, base_salary, bank_name, bank_account, status')
  .eq('status', 'active')
  .eq('company_id', userProfile.company_id)
```

---

## 📅 **PASO 5: Obtener Registros de Asistencia**

```typescript
// Obtener registros de asistencia del período
const { data: attendanceRecords, error: attError } = await supabase
  .from('attendance_records')
  .select('employee_id, date, check_in, check_out')
  .gte('date', fechaInicio)
  .lte('date', fechaFin)

// Filtrar solo empleados con asistencia completa
const empleadosConAsistencia = employees.filter(emp =>
  attendanceRecords.some(record => 
    record.employee_id === emp.id && 
    record.check_in && 
    record.check_out
  )
)
```

---

## 💰 **PASO 6: Cálculo de Nómina**

### **Para cada empleado con asistencia:**

```typescript
const planilla = empleadosConAsistencia.map(emp => {
  // 1. Contar días trabajados
  const registros = attendanceRecords.filter(record => 
    record.employee_id === emp.id && 
    record.check_in && 
    record.check_out
  )
  const days_worked = registros.length
  
  // 2. Calcular salario base
  const base_salary = Number(emp.base_salary) || 0
  const total_earnings = base_salary / 2  // Salario quincenal
  
  // 3. Calcular deducciones (si están habilitadas)
  let IHSS = 0, RAP = 0, ISR = 0, total_deductions = 0
  
  if (incluirDeducciones) {
    IHSS = calcularIHSS(base_salary)     // Seguro social
    RAP = calcularRAP(base_salary)       // Impuesto profesional
    ISR = calcularISR(base_salary)       // Impuesto sobre la renta
    total_deductions = IHSS + RAP + ISR
  }
  
  // 4. Calcular salario neto
  const total = total_earnings - total_deductions
  
  // 5. Generar notas automáticas
  let notes_on_ingress = ''
  let notes_on_deductions = ''
  
  if (days_worked < (quincena === 1 ? 15 : ultimoDia - 15)) {
    notes_on_ingress = `Faltaron ${quincena === 1 ? 15 : ultimoDia - 15 - days_worked} días de asistencia completa.`
  }
  
  return {
    name: emp.name,
    id: emp.dni,
    bank: emp.bank_name || '',
    bank_account: emp.bank_account || '',
    monthly_salary: base_salary,
    days_worked,
    total_earnings,
    IHSS: Math.round(IHSS * 100) / 100,
    RAP: Math.round(RAP * 100) / 100,
    ISR: Math.round(ISR * 100) / 100,
    total_deductions: Math.round(total_deductions * 100) / 100,
    total: Math.round(total * 100) / 100,
    notes_on_ingress,
    notes_on_deductions
  }
})
```

---

## 💾 **PASO 7: Guardar en Base de Datos**

```typescript
// Preparar registros para guardar
const payrollRecords = planilla.map(item => ({
  employee_id: empleadosConAsistencia.find(e => e.dni === item.id)?.id,
  period_start: fechaInicio,
  period_end: fechaFin,
  period_type: 'biweekly',
  base_salary: item.monthly_salary,
  gross_salary: item.total_earnings,
  income_tax: item.ISR,
  social_security: item.IHSS,
  professional_tax: item.RAP,
  total_deductions: item.total_deductions,
  net_salary: item.total,
  days_worked: item.days_worked,
  status: 'draft',  // Estado inicial: borrador
  notes_on_ingress: item.notes_on_ingress,
  notes_on_deductions: item.notes_on_deductions
}))

// Guardar en tabla payroll_records
const { error: saveError } = await supabase
  .from('payroll_records')
  .upsert(payrollRecords, { 
    onConflict: 'employee_id,period_start,period_end',
    ignoreDuplicates: false 
  })
```

---

## 📤 **PASO 8: Respuesta al Usuario**

```typescript
// Retornar resultado exitoso
return res.status(200).json({
  message: 'Nómina calculada exitosamente',
  periodo,
  quincena,
  empleados: planilla.length,
  planilla  // Datos calculados para mostrar en UI
})
```

---

## 🎉 **PASO 9: Actualización de la Interfaz**

```typescript
// En PayrollManager.tsx
if (!response.ok) {
  throw new Error(data.error || 'Failed to generate payroll')
}

alert('Payroll generated successfully!')
setShowGenerateForm(false)
fetchData()  // Recargar datos para mostrar la nueva nómina
```

---

## 📄 **PASO 10: Generación de PDF (Opcional)**

### **Cuando el usuario hace clic en "Descargar PDF":**

```typescript
// En PayrollManager.tsx
const downloadPayrollPDF = (record: PayrollRecord) => {
  const period = record.period_start.slice(0, 7)
  const day = Number(record.period_start.slice(8, 10))
  const quincena = day === 1 ? 1 : 2
  const url = `/api/payroll/report?periodo=${period}&quincena=${quincena}`
  window.open(url, '_blank')
}
```

### **Endpoint de Exportación:** `GET /api/payroll/export`

```typescript
// 1. Obtener datos de payroll_records
const { data: payrollRecords } = await supabase
  .from('payroll_records')
  .select('*')
  .eq('period_start', fechaInicio)
  .eq('period_end', fechaFin)

// 2. Generar PDF con PDFKit
const doc = new PDFDocument({ size: 'A4', layout: 'landscape' })
// ... generar contenido del PDF ...

// 3. Enviar PDF al navegador
res.setHeader('Content-Type', 'application/pdf')
res.setHeader('Content-Disposition', `attachment; filename=planilla_${periodo}_q${quincena}.pdf`)
res.send(pdf)
```

---

## 🔄 **Flujo Completo en Resumen:**

1. **Usuario** → Llena formulario y presiona "Generar Nómina"
2. **Frontend** → Envía POST a `/api/payroll/calculate`
3. **Backend** → Valida autenticación y permisos
4. **Backend** → Obtiene empleados activos
5. **Backend** → Obtiene registros de asistencia del período
6. **Backend** → Calcula nómina para cada empleado
7. **Backend** → Guarda en tabla `payroll_records`
8. **Backend** → Retorna datos calculados
9. **Frontend** → Muestra mensaje de éxito
10. **Frontend** → Actualiza lista de nóminas
11. **Usuario** → Puede descargar PDF (opcional)

---

## 📊 **Datos Generados:**

- **Tabla:** `payroll_records`
- **Estado:** `draft` (borrador)
- **Campos:** Salario base, bruto, deducciones, neto, días trabajados
- **Notas:** Automáticas sobre asistencia y deducciones
- **PDF:** Generado bajo demanda con formato profesional

---

## ⚠️ **Consideraciones Importantes:**

- **Solo empleados con asistencia** aparecen en la nómina
- **Deducciones opcionales** (IHSS, RAP, ISR)
- **Prevención de duplicados** por empleado/período
- **Validación de permisos** estricta
- **Notas automáticas** para casos especiales
- **Estado inicial:** `draft` (requiere aprobación posterior) 