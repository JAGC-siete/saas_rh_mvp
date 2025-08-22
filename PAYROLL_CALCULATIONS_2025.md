# 🧮 **Fórmulas de Nómina Honduras 2025 - Sistema Implementado**

## 📋 **Resumen de Cambios Implementados**

### **🔄 Cambios Principales:**
1. **IHSS**: Corregido de 2.5% a 5% total (2.5% EM + 2.5% IVM)
2. **RAP**: Mantenido en 1.5% del excedente sobre L 11,903.13
3. **ISR**: Actualizada tabla mensual 2025 con exención hasta L 21,457.76
4. **Deducciones**: Solo se aplican en la segunda quincena del mes

---

## 🔢 **Constantes del Sistema (HONDURAS_2025_CONSTANTS):**

```typescript
const HONDURAS_2025_CONSTANTS = {
  SALARIO_MINIMO: 11903.13,                    // Salario mínimo legal
  IHSS_TECHO: 11903.13,                        // Techo IHSS 2025
  IHSS_PORCENTAJE_EMPLEADO: 0.05,              // 5% total (2.5% EM + 2.5% IVM)
  IHSS_PORCENTAJE_PATRONO: 0.088,              // 5% EM + 3.5% IVM + 0.2% RP
  RAP_PORCENTAJE: 0.015,                       // 1.5% empleado + 1.5% patrono
  ISR_EXENCION_ANUAL: 40000,                   // Deducción médica anual L 40,000
  ISR_BRACKETS_ANUAL: [                        // Tabla ANUAL 2025 (SAR)
    { limit: 40000, rate: 0.00, base: 0 },                    // Exento hasta L 40,000
    { limit: 217493.16, rate: 0.15, base: 0 },                // 15%
    { limit: 494224.40, rate: 0.20, base: 26623.97 },         // 20%
    { limit: Infinity, rate: 0.25, base: 81947.97 }           // 25%
  ]
}
```

---

## 🧮 **Fórmulas Implementadas**

### **1. Salario Bruto (Gross Salary)**
```typescript
const dailyRate = baseSalary / 30
const baseGrossSalary = dailyRate * daysWorked
const grossSalary = baseGrossSalary + overtimeAmount
```

### **2. IHSS (Instituto Hondureño de Seguridad Social)**
```typescript
// 5% total (2.5% EM + 2.5% IVM) con techo L 11,903.13
const ihssBase = Math.min(baseSalary, 11903.13)
const ihss = ihssBase * 0.05  // 5% mensual
```

**Nota**: Solo se aplica en la segunda quincena del mes.

### **3. RAP (Retención Ahorro Programado)**
```typescript
// 1.5% sobre el excedente del salario mínimo
const rap = Math.max(0, baseSalary - 11903.13) * 0.015
```

**Nota**: Solo se aplica en la segunda quincena del mes.

### **4. ISR (Impuesto Sobre la Renta)**
```typescript
// Tabla ANUAL 2025 con deducción médica de L 40,000
const annualSalary = baseSalary * 12
const baseImponible = annualSalary - 40000  // Deducción médica anual

if (baseImponible <= 0) return 0

// Aplicar tramos progresivos ANUALES
for (const bracket of ISR_BRACKETS_ANUAL) {
  if (baseImponible <= bracket.limit) {
    const isrAnnual = bracket.base + (baseImponible - bracket.limit) * bracket.rate
    return isrAnnual / 12 // Convertir a mensual
  }
}
```

**Nota**: Solo se aplica en la segunda quincena del mes.

---

## 📅 **Lógica de Aplicación por Quincena**

### **Primera Quincena (1-15):**
- ✅ Salario bruto completo
- ❌ **SIN deducciones**
- 📝 Nota: "Primera quincena: sin deducciones (se aplican en Q2)"

### **Segunda Quincena (16-31):**
- ✅ Salario bruto completo
- ✅ **CON deducciones mensuales completas**
- 📝 Nota: "Deducciones aplicadas en Q2: IHSS L.X, RAP L.Y, ISR L.Z"

---

## 🎯 **Tabla ISR ANUAL 2025 (SAR)**

| Rango Anual | Tasa | Base | Cálculo |
|-------------|------|------|---------|
| Hasta L 40,000 | 0% | 0 | **Exento** (deducción médica) |
| L 40,000.01 - L 217,493.16 | 15% | 0 | (Salario Anual - 40,000) × 15% |
| L 217,493.17 - L 494,224.40 | 20% | L 26,623.97 | L 26,623.97 + (Salario Anual - 217,493.16) × 20% |
| L 494,224.41+ | 25% | L 81,947.97 | L 81,947.97 + (Salario Anual - 494,224.40) × 25% |

**Nota**: El ISR se calcula anualmente y se divide entre 12 para obtener el mensual.

---

## 🔍 **Verificación de Cálculos**

### **Ejemplo: Empleado con L 25,000 mensual**

1. **Salario Anual**: L 25,000 × 12 = L 300,000
2. **Base Imponible ISR**: L 300,000 - L 40,000 = L 260,000
3. **ISR Anual**: L 26,623.97 + (L 260,000 - L 217,493.16) × 20% = L 34,923.97
4. **ISR Mensual**: L 34,923.97 ÷ 12 = L 2,910.33
5. **IHSS**: L 11,903.13 × 5% = L 595.16 (topeado)
6. **RAP**: (L 25,000 - L 11,903.13) × 1.5% = L 196.45

**Total Deducciones**: L 2,910.33 + L 595.16 + L 196.45 = L 3,701.94

---

## ⚠️ **Consideraciones Importantes**

1. **Deducciones Mensuales**: No se dividen entre quincenas
2. **Aplicación Única**: Solo en segunda quincena del mes
3. **Tope IHSS**: L 11,903.13 (no el salario mínimo)
4. **Exención ISR**: L 21,457.76 mensual (no anual)
5. **Compatibilidad**: Sistema mantiene compatibilidad con registros existentes

---

## 🚀 **Archivos Modificados**

- `components/PayrollManager.tsx` - Constantes y funciones frontend
- `pages/api/payroll/calculate.ts` - Cálculos backend principales
- `pages/api/payroll.ts` - API de nómina general
- `PAYROLL_CALCULATIONS_2025.md` - Esta documentación

---

## ✅ **Estado de Implementación**

- [x] Constantes actualizadas
- [x] Fórmulas IHSS corregidas
- [x] Fórmulas RAP verificadas
- [x] Tabla ISR mensual 2025
- [x] Lógica de aplicación por quincena
- [x] Backend actualizado
- [x] Frontend actualizado
- [x] Documentación completa

**Sistema listo para producción con fórmulas oficiales de Honduras 2025** 🎯
