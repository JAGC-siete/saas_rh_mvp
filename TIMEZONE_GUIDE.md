# 🇭🇳 GUÍA DEFINITIVA DE TIMEZONE PARA TEGUCIGALPA

## 🚨 REGLA DE ORO: SIEMPRE USA AMERICA/TEGUCIGALPA

**EL CLIENTE ESTÁ EN TEGUCIGALPA, HONDURAS. TODA LA APLICACIÓN DEBE USAR `America/Tegucigalpa`.**

---

## ✅ FUNCIONES APROBADAS (USA ESTAS)

```typescript
import { 
  nowInHonduras,           // En lugar de new Date()
  todayInHonduras,         // En lugar de new Date().toISOString().split('T')[0]
  getHondurasTimestamp,    // En lugar de new Date().toISOString()
  formatDateForHonduras,   // En lugar de .toLocaleDateString()
  formatDateTimeForHonduras // En lugar de .toLocaleString()
} from '../lib/timezone'

// ✅ CORRECTO
const now = nowInHonduras()
const today = todayInHonduras()
const timestamp = getHondurasTimestamp()
const displayDate = formatDateForHonduras(someDate)
```

## ❌ FUNCIONES PROHIBIDAS (NO USES ESTAS)

```typescript
// ❌ INCORRECTO - Usa UTC por defecto
new Date()
Date.now()
new Date().toISOString()
new Date().toLocaleDateString()
new Date().toLocaleString()

// ❌ INCORRECTO - Timezone del servidor/navegador
Intl.DateTimeFormat().format()
moment() // sin timezone
dayjs() // sin timezone
```

---

## 🔧 CORRECCIONES AUTOMÁTICAS APLICADAS

Se han corregido automáticamente **110 problemas de timezone** en **46 archivos**:

### Archivos Corregidos:
- ✅ `pages/api/**/*.ts` - Todas las APIs ahora usan Honduras timezone
- ✅ `components/**/*.tsx` - Todos los componentes formatean fechas correctamente
- ✅ `lib/**/*.ts` - Todas las utilidades usan timezone consistente

### Scripts Utilizados:
1. `scripts/fix-timezone-issues.mjs` - Corrección automática de patrones
2. `scripts/fix-timezone-imports.mjs` - Corrección de imports faltantes
3. `scripts/cleanup-timezone-duplicates.mjs` - Limpieza de imports duplicados

---

## 🛡️ VALIDACIÓN AUTOMÁTICA

### En Desarrollo:
```typescript
// Importa en _app.tsx para validación global
import 'lib/timezone-validator'
```

### En APIs:
```typescript
import { timezoneValidationMiddleware } from 'lib/timezone-validator'

// Usa en middleware para detectar problemas automáticamente
export default timezoneValidationMiddleware(handler)
```

---

## 📋 CHECKLIST PARA NUEVOS DESARROLLOS

Antes de crear cualquier funcionalidad que use fechas:

- [ ] ¿Estoy usando `nowInHonduras()` en lugar de `new Date()`?
- [ ] ¿Estoy usando `todayInHonduras()` para fechas de base de datos?
- [ ] ¿Estoy usando `formatDateForHonduras()` para mostrar fechas al usuario?
- [ ] ¿He importado las funciones de `lib/timezone`?
- [ ] ¿He probado que las fechas se muestren correctamente en Honduras?

---

## 🎯 CASOS DE USO COMUNES

### 1. Registro de Asistencia
```typescript
// ✅ CORRECTO
const checkInTime = nowInHonduras()
const today = todayInHonduras()

// Guardar en base de datos
await supabase.from('attendance_records').insert({
  employee_id,
  date: today,
  check_in: getHondurasTimestamp(),
  // ...
})
```

### 2. Reportes y Exportación
```typescript
// ✅ CORRECTO
const reportDate = formatDateForHonduras(nowInHonduras())
doc.text(`Fecha de generación: ${reportDate}`)
```

### 3. Filtros de Fecha
```typescript
// ✅ CORRECTO - Usar lib/attendance.ts que ya maneja timezone
import { getDateRange } from 'lib/attendance'

const range = getDateRange('today') // Ya usa America/Tegucigalpa
```

---

## 🚨 IMPORTANTE: NUNCA MÁS OLVIDES

1. **CLIENTE = TEGUCIGALPA** → Usar `America/Tegucigalpa`
2. **TODA FECHA** → Usar funciones de `lib/timezone`
3. **NUEVA FUNCIONALIDAD** → Revisar checklist arriba
4. **ANTES DE COMMIT** → Ejecutar `npm run build` para verificar

---

## 🔍 VERIFICACIÓN RÁPIDA

Para verificar que todo esté correcto:

```bash
# Buscar usos problemáticos
grep -r "new Date()" pages/ components/ lib/ --exclude-dir=node_modules

# Debe retornar solo archivos específicos como timezone.ts
# Si encuentra otros archivos, corregir manualmente
```

---

## 📞 EN CASO DE DUDAS

Si encuentras un caso no cubierto en esta guía:

1. Revisa `lib/timezone.ts` - probablemente ya existe una función
2. Si no existe, créala siguiendo el patrón existente
3. **SIEMPRE** usa `America/Tegucigalpa` como timezone base

**RECUERDA: El cliente está en TEGUCIGALPA. Todo debe funcionar en su zona horaria.**
