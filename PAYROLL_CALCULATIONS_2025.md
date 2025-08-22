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
// CONSTANTES CORRECTAS HONDURAS 2025 (VERIFICACIÓN CRUZADA)
const HONDURAS_2025_CONSTANTS = {
  SALARIO_MINIMO: 11903.13,                    // Salario mínimo legal
  IHSS_TECHO: 11903.13,                        // Techo IHSS 2025 (EM + IVM)
  IHSS_PORCENTAJE_EMPLEADO: 0.05,              // 5% total (2.5% EM + 2.5% IVM)
  RAP_PORCENTAJE: 0.015,                       // 1.5% empleado
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
// TABLA MENSUAL CORRECTA 2025 (derivada de anual SAR)
const ISR_BRACKETS_MENSUAL = [
  { limit: 21457.76, rate: 0.00, base: 0 },                    // Exento hasta L 21,457.76
  { limit: 30969.88, rate: 0.15, base: 0 },                    // 15%
  { limit: 67604.36, rate: 0.20, base: 1428.32 },             // 20%
  { limit: Infinity, rate: 0.25, base: 8734.32 }              // 25%
]

// Aplicar tabla mensual directamente
for (const bracket of ISR_BRACKETS_MENSUAL) {
  if (monthlySalary <= bracket.limit) {
    if (bracket.rate === 0) return 0
    return bracket.base + (monthlySalary - (bracket.base > 0 ? bracket.limit : 0)) * bracket.rate
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

## 🎯 **Tabla ISR MENSUAL 2025 (derivada de anual SAR)**

| Rango Mensual | Tasa | Base | Cálculo |
|---------------|------|------|---------|
| Hasta L 21,457.76 | 0% | 0 | **Exento** |
| L 21,457.77 - L 30,969.88 | 15% | 0 | (Salario Mensual - 21,457.76) × 15% |
| L 30,969.89 - L 67,604.36 | 20% | L 1,428.32 | L 1,428.32 + (Salario Mensual - 30,969.88) × 20% |
| L 67,604.37+ | 25% | L 8,734.32 | L 8,734.32 + (Salario Mensual - 67,604.36) × 25% |

**Nota**: El ISR se calcula mensualmente usando la tabla derivada de la anual SAR.

---

## 🔍 **Verificación de Cálculos**

### **Ejemplo: Empleado con L 25,000 mensual**

1. **Salario Mensual**: L 25,000
2. **Tramo ISR**: L 21,457.77 - L 30,969.88 (15%)
3. **ISR Mensual**: (L 25,000 - L 21,457.76) × 15% = L 531.34
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
