# Checklist de Evaluación: MainHeader en Páginas

## 📋 Configuración del Header en Landing (`/pages/index.tsx`)

### Props del MainHeader
- ✅ `enableScrollEffect={true}` - Efecto de scroll habilitado (transparente → sólido)
- ✅ `fixed={true}` - Header fijo en la parte superior

### Estructura Visual del Header

#### 1. Barra Superior Dorada
- ✅ **Clase CSS**: `h-1 bg-amber-900/80 w-full`
- ✅ **Ubicación**: Primera línea del header, ancho completo
- ✅ **Color**: Ámbar oscuro con 80% de opacidad

#### 2. Logo HUMANO SISU
- ✅ **Ubicación**: Izquierda del header
- ✅ **Componente**: `Image` de Next.js
- ✅ **Ruta**: `/logo-humano-sisu.png`
- ✅ **Dimensiones**: `width={128} height={128}`
- ✅ **Contenedor**: `bg-white/10 px-6 py-4 rounded-lg border border-white/20 backdrop-blur-sm`
- ✅ **Link**: Envuelto en `<Link href="/">`

#### 3. Navegación Central (Desktop)
- ✅ **Visibilidad**: `hidden md:flex` (oculto en móvil, visible en desktop)
- ✅ **Links**:
  - "Cómo funciona" → `#como-funciona` (scroll suave)
  - "Servicios" → `#servicios` (scroll suave)
  - "Programa de Afiliados" → `/afiliados` (navegación)
- ✅ **Estilos**: `text-brand-200 hover:text-white px-3 py-2 rounded-full text-sm font-medium`
- ✅ **Efectos**: `hover:bg-white/10 hover:-translate-y-0.5`

#### 4. Botones a la Derecha (Desktop)
- ✅ **Botón Verde**: "Activar demostración gratuita"
  - Color: `bg-green-600 hover:bg-green-700`
  - Acción: Redirige a `/activar`
  - Ancho mínimo: `min-w-[160px]`
- ✅ **Botón Azul**: "Iniciar sesión"
  - Color: `bg-brand-600 hover:bg-brand-700`
  - Acción: Link a `/app/login`
  - Ancho mínimo: `min-w-[140px]`

#### 5. Menú Móvil
- ✅ **Botón hamburguesa**: Visible solo en móvil (`md:hidden`)
- ✅ **Iconos**: Menú (3 líneas) / Cerrar (X)
- ✅ **Menú desplegable**: Mismo contenido que desktop pero en formato vertical
- ✅ **Estilos**: `glass-strong rounded-lg shadow-lg`

#### 6. Fondo del Header
- ✅ **Con scroll effect activado**:
  - Inicial: `bg-transparent border-b border-white/10`
  - Al hacer scroll: `bg-slate-900/90 backdrop-blur-sm border-b border-white/20 shadow-lg`
- ✅ **Sin scroll effect**: `bg-slate-900/90 backdrop-blur-sm border-b border-white/20 shadow-lg`
- ✅ **Transición**: `transition-all duration-300`

### Configuración de la Página

#### Fondo de la Página
- ✅ **Clase**: `bg-app` (gradiente: slate-900 → blue-900 → indigo-900)
- ✅ **Padding superior**: `pt-20` o `pt-24` (para compensar header fijo)
- ✅ **Posición**: `relative` en el contenedor principal

#### Estructura HTML
```tsx
<div className="min-h-screen bg-app pt-20 relative">
  <MainHeader enableScrollEffect={true} fixed={true} />
  {/* contenido */}
</div>
```

---

## ✅ Checklist para Evaluar Otras Páginas

### Importación
- [ ] ¿Está importado `MainHeader` desde `../components/MainHeader`?

### Props del MainHeader
- [ ] ¿Se usa `enableScrollEffect={false}` para páginas sin scroll effect?
- [ ] ¿Se usa `enableScrollEffect={true}` solo en landing?
- [ ] ¿Se especifica `fixed={true}` (o se deja por defecto)?

### Estructura Visual
- [ ] ¿Aparece la barra dorada superior (`bg-amber-900/80`)?
- [ ] ¿El logo HUMANO SISU está visible y funcional?
- [ ] ¿Los 3 links de navegación están presentes?
- [ ] ¿El botón verde "Activar demostración gratuita" está presente?
- [ ] ¿El botón azul "Iniciar sesión" está presente?
- [ ] ¿El menú móvil funciona correctamente?

### Fondo y Espaciado
- [ ] ¿El fondo usa `bg-app` (mismo gradiente que landing)?
- [ ] ¿Tiene `pt-24` para compensar el header fijo?
- [ ] ¿El contenedor principal tiene `relative`?

### Consistencia de Colores
- [ ] ¿El header usa `bg-slate-900/90` cuando está sólido?
- [ ] ¿Los links usan `text-brand-200`?
- [ ] ¿El botón verde usa `bg-green-600`?
- [ ] ¿El botón azul usa `bg-brand-600`?

### Funcionalidad
- [ ] ¿Los links de navegación funcionan correctamente?
- [ ] ¿El botón "Activar" redirige a `/activar`?
- [ ] ¿El botón "Iniciar sesión" redirige a `/app/login`?
- [ ] ¿El logo redirige a `/`?

---

## 📊 Páginas a Evaluar

1. `/pages/index.tsx` (Landing) - ✅ Referencia
2. `/pages/activar.tsx`
3. `/pages/app/login.tsx`
4. `/pages/auth/start.tsx`
5. `/pages/afiliados.tsx`

