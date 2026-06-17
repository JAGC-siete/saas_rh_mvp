# Humano SISU — Referencia visual del Landing

> Archivo consolidado para pegar en Google AI Studio u otra herramienta de diseño.
> Solo contiene apariencia y estilo. Sin lógica de negocio, analytics ni SEO.

---

## Sistema actual: Infraestructura Líquida (2026)

El landing usa el diseño **Infraestructura Líquida** implementado en `components/landing/`:

| Archivo | Rol |
|---|---|
| `styles/landing-liquid.css` | `.bg-mesh`, `.glass-modern`, `.btn-shiny`, `.border-beam` |
| `MeshBackground.tsx` | Fondo mesh animado (reemplaza CloudBackground) |
| `DockNavbar.tsx` | Navbar cápsula flotante; login tras 20% scroll |
| `MagneticHero.tsx` | Hero 70/30 con H1 gradiente + parallax |
| `HeroProductWindow.tsx` | Carousel con progress bar y parallax |
| `BentoServicesGrid.tsx` | Servicios en grid asimétrico |
| `HowItWorksBento.tsx` | 3 pasos en celdas glass |
| `CursorSpotlight.tsx` | Spotlight que sigue el mouse (desktop) |
| `TrustBar.tsx` | Marquee de clientes pre-footer |
| `ScrollReveal.tsx` | Animación scroll con Framer Motion |
| `PublicPageShell.tsx` | Layout compartido para ~40 páginas públicas |
| `AppMeshShell.tsx` | Atmósfera mesh para `/app` autenticado (Dashboard + Super Admin) |
| `BorderBeam.tsx` | Borde animado opcional en cards de formulario |

**Paleta minimalista:** fondo `slate-950`, texto `slate-400` / `white`, acento números `cyan-400`, CTAs `brand-500` + `btn-shiny`.

---

## PublicPageShell — layout público unificado

Todas las páginas públicas (excepto `/app/*` dashboard y páginas de debug) usan `components/landing/PublicPageShell.tsx`:

```tsx
<PublicPageShell
  showSpotlight={false}      // marketing long-form: true
  showFooter={true}          // forms fullscreen: false
  showTrustBar={false}       // solo landings largas
  loginAlwaysVisible={false} // /activar, /ventas: true
  centered={false}           // auth/simple: true
  mainClassName=""
>
  {children}
</PublicPageShell>
```

**Incluye:** `MeshBackground`, `DockNavbar`, `<main>` con `pt-20`, opcional `CursorSpotlight`, `TrustBar`, `DemoFooter variant="minimal"` vía `.landing-footer-bridge`.

**Card pública:** `variant="liquid"` → clase `glass-modern text-white rounded-2xl` (`components/ui/card.tsx`).

**Inputs públicos:** clase `input-glass` (definida en `styles/globals.css`).

### Inventario de páginas migradas

| Oleada | Rutas |
|---|---|
| Referencia | `/` |
| Conversión | `/activar`, `/ventas` |
| Funnel | `/afiliados`, `/afiliados/confirm`, `/afiliados/questionnaire`, `/gracias`, `/suscripcion`, `/onboarding`, `/demo` |
| Calculadoras | `/calculadora`, `/calculadora-deducciones*`, `/calculadora-prestaciones` (+ `PublicDeductionCalculator`) |
| SEO | `/info`, `/implementacion-48-horas`, `/alternativa-odoo-honduras`, `/sistema-biometrico-nomina`, `/deducciones-honduras-ihss-rap-isr` |
| Contenido / legal | `/recursos`, `/recursos/[slug]`, `/politicadeprivacidad`, `/terminos-de-servicio` |
| Mail list | `/mail-list/confirm`, `/mail-list/unsubscribe` |
| Auth | `/auth/*`, `/login`, `/register`, `/app/login`, `/app/forgot-password` |
| Trial | `/trial-dashboard`, `/trial/*` |
| Otros | `/attendance/public`, `/employees/*`, `/unauthorized` |

**Excluidas:** `/app/*` (dashboard), debug, `404`/`500`.

**Legacy (solo rutas no migradas):** `MainHeader`, `CloudBackground`, `.glass` / `.glass-strong` en código legacy.

---

## AppMeshShell — atmósfera `/app` autenticado

Layouts internos (`DashboardLayout`, `SuperAdminLayout`) comparten `components/landing/AppMeshShell.tsx`:

```tsx
<AppMeshShell className="h-screen min-h-0">
  {/* sidebar glass-modern z-20 + main z-10 */}
</AppMeshShell>
```

| Layout | Rutas | Nav activo |
|---|---|---|
| `SuperAdminLayout` | `/app/admin/*` | Command Center: `bg-brand-600/20` + `border-brand-400/30` |
| `DashboardLayout` | `/app/dashboard`, nómina, asistencia, etc. | Mismo patrón Command Center |

**Cards en app:** `variant="liquid"` (estándar). **Inputs:** clase `input-glass`.

**`_app.tsx`:** sin `bg-app` en rutas `/app` autenticadas (mesh del layout prevalece). Login/forgot-password usan `PublicPageShell`.

---

## Prompt sugerido para AI Studio

```
Este es el landing de Humano SISU (SaaS de nómina y RRHH para PyMEs en Honduras, El Salvador y Guatemala).

Stack visual:
- Next.js + Tailwind CSS
- Tema oscuro con gradiente azul/índigo (slate-900 → blue-900 → indigo-900)
- Efecto glassmorphism (paneles semitransparentes con blur)
- Fuente: Montserrat (400, 600, 700)
- Acentos: brand blue (#3b82f6), cyan para herramientas, green para CTAs de activación

Audiencia: dueños de PyMEs y gerentes de RRHH en Centroamérica.

Revisa y sugiere mejoras en:
1. Jerarquía visual y legibilidad
2. Consistencia de colores y espaciado entre secciones
3. CTAs y conversión (cotización vs trial vs login)
4. Contraste footer claro vs body oscuro
5. Mobile-first y accesibilidad
6. Sensación de confianza (testimonios, certificaciones AWS)
```

---

## 1. Identidad visual (resumen)

| Elemento | Valor |
|---|---|
| **Marca** | Humano SISU |
| **Producto** | Nómina + asistencia biométrica automatizada |
| **Tono** | Profesional, tecnológico, confiable, local (CA) |
| **Modo** | Oscuro predominante; footer en blanco (contraste fuerte) |
| **Tipografía** | Montserrat |
| **Radio bordes** | 12–20px (`rounded-xl`, `rounded-2xl`, `rounded-3xl`) |
| **Efecto signature** | Glass + gradiente + nubes animadas sutiles |

---

## 2. Paleta de colores

### Tailwind `brand` (color principal)

```
brand-50:  #eff6ff
brand-100: #dbeafe
brand-200: #bfdbfe   ← texto secundario sobre fondo oscuro
brand-300: #93c5fd   ← acentos en títulos (segunda línea del H1/H2)
brand-400: #60a5fa   ← highlights, iconos
brand-500: #3b82f6   ← azul principal
brand-600: #2563eb   ← botones, glows
brand-700: #1d4ed8
brand-800: #1e40af
brand-900: #1e3a8a   ← azul corporativo principal
```

### Gradiente de fondo global (`.bg-app`)

```css
--bg-start: #0f172a;  /* slate-900 */
--bg-mid:   #1e3a8a;  /* blue-900 */
--bg-end:   #312e81;  /* indigo-900 */

background-image:
  radial-gradient(1200px 600px at 20% 10%, rgba(255,255,255,0.06), transparent 60%),
  radial-gradient(1000px 500px at 80% 90%, rgba(255,255,255,0.04), transparent 60%),
  linear-gradient(160deg, var(--bg-start), var(--bg-mid) 50%, var(--bg-end));
```

### Colores de acento por contexto

| Uso | Clases / valores |
|---|---|
| CTA primario hero | `bg-sky-600 hover:bg-sky-700` |
| CTA activación | `bg-green-600 hover:bg-green-700` |
| CTA login | `bg-brand-600 hover:bg-brand-700` |
| Badges confianza | `bg-green-500/20 text-green-300 border-green-500/30` |
| Badges info | `bg-blue-500/20 text-blue-300` |
| Badges soporte | `bg-purple-500/20 text-purple-300` |
| Herramientas gratis | `bg-cyan-500/20 text-cyan-200 border-cyan-500/30` |
| Estrellas testimonios | `text-yellow-400` |
| Texto principal | `text-white` |
| Texto secundario | `text-brand-200/90`, `text-brand-200/80`, `text-gray-300` |

### Footer (contraste: fondo claro)

```
bg-white, border-gray-200
text-gray-900 (títulos), text-gray-600 (cuerpo), text-gray-500 (legal)
hover: text-blue-600 / text-green-600 (links)
```

---

## 3. Tokens CSS (glass y utilidades)

```css
:root {
  --glass-bg: rgba(255,255,255,.10);
  --glass-border: rgba(255,255,255,.22);
  --glass-blur: 14px;
  --glass-radius: 16px;
  --primary-color: #3b82f6;
  --primary-hover: #2563eb;
}

/* Panel glass estándar */
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(14px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0,0,0,.20);
}

/* Panel glass más opaco (hero, cards destacadas) */
.glass-strong {
  background: rgba(255,255,255,.14);
  border: 1px solid rgba(255,255,255,.28);
  backdrop-filter: blur(14px);
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0,0,0,.20);
}

/* Input sobre fondo oscuro */
.input-glass {
  border-radius: 0.75rem;
  border: 1px solid rgba(255,255,255,.25);
  background: rgba(255,255,255,.14);
  color: #fff;
  backdrop-filter: blur(8px);
  padding: 0.75rem 0.9rem;
}
```

---

## 4. Animaciones

```css
/* Entrada sutil de badges/elementos */
@keyframes fade-up-subtle {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-up-subtle { animation: fade-up-subtle 0.6s ease-out both; }

/* Glow pulsante en CTAs */
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.4); }
  50%       { box-shadow: 0 0 20px 4px rgba(59,130,246,0.1); }
}

/* Nubes de fondo — 3 capas con drift horizontal */
.animate-cloud-drift-slow   /* ~120–180s */
.animate-cloud-drift-medium /* más rápido + twinkle */
.animate-cloud-drift-fast   /* capa cercana */

/* Hover en cards */
transition-all duration-300
hover:border-brand-400/40
hover:shadow-xl hover:shadow-brand-900/30
hover:-translate-y-0.5
```

---

## 5. Tipografía y escala

### Patrón de títulos (H1 / H2)

Dos líneas con contraste de color:
- Línea 1: `text-white`
- Línea 2: `text-brand-300`

```html
<!-- Ejemplo H1 hero -->
<h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight">
  <span class="text-white block sm:inline">Gestión de Capital Humano 100% Automatizada:</span>
  <span class="text-brand-300 block text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl mt-2 sm:mt-1">
    Dejá el Excel y eliminá los errores en tu nómina.
  </span>
</h1>
<p class="text-lg sm:text-xl text-brand-200/90 max-w-3xl mx-auto mt-4 sm:mt-6">
  Subtítulo descriptivo...
</p>
```

### Escala responsive típica

| Elemento | Mobile → Desktop |
|---|---|
| H1 | `text-2xl` → `xl:text-6xl` |
| H2 sección | `text-2xl` → `xl:text-6xl` |
| H3 subsección | `text-lg` → `text-xl` |
| Body | `text-sm` → `text-base` |
| Badges | `text-xs` |
| Padding sección | `py-12 sm:py-16 md:py-20` |
| Container | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` |

---

## 6. Estructura de la página (orden de secciones)

```
┌─────────────────────────────────────────────┐
│  DockNavbar (cápsula flotante, mesh)        │
├─────────────────────────────────────────────┤
│  HERO (MagneticHero + HeroProductWindow)    │
├─────────────────────────────────────────────┤
│  BENTO SERVICES + HOW IT WORKS              │
├─────────────────────────────────────────────┤
│  FREE TOOLS + MAIL LIST                     │
├─────────────────────────────────────────────┤
│  TrustBar (marquee)                         │
├─────────────────────────────────────────────┤
│  DemoFooter minimal (landing-footer-bridge) │
└─────────────────────────────────────────────┘
```

Wrapper raíz landing: `PublicPageShell` → `min-h-screen bg-mesh`

Páginas públicas secundarias: mismo shell con props según tipo (ver sección PublicPageShell).

---

## 7. Componentes — clases visuales clave

### 7.1 Navbar pública (`DockNavbar`)

```html
<!-- Cápsula flotante centrada; login visible tras 20% scroll (o siempre con loginAlwaysVisible) -->
<nav class="fixed top-4 left-1/2 -translate-x-1/2 z-50 ... glass-modern rounded-full">
  <!-- Logo + enlaces ancla + CTA Activar + Login -->
</nav>
```

*(Legacy `MainHeader` solo en rutas `/app/*` internas.)*

---

### 7.2 Hero badges

```html
<span class="px-3 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
  ✅ Adaptado a leyes de CA (HN, SV, GT)
</span>
<span class="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
  ⚡ Implementación rápida
</span>
<span class="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">
  🤝 Soporte local
</span>
```

### 7.3 LandingHero (card principal)

```html
<div class="glass-strong rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-12
            backdrop-blur-sm border border-white/20 shadow-2xl">
  <!-- ImageCarousel -->
  <div class="relative aspect-[4/3] w-full rounded-2xl overflow-hidden
              bg-white/80 backdrop-blur shadow-xl border border-white/20">
    <img class="object-cover transition-all duration-500" />
    <div class="absolute bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
      <h3 class="text-white font-bold text-lg">Título slide</h3>
      <p class="text-white/90 text-sm">Descripción</p>
    </div>
  </div>

  <!-- CTAs -->
  <a class="rounded-xl px-6 py-3 text-base sm:text-lg font-semibold
            bg-sky-600 text-white hover:bg-sky-700 focus:ring-2 focus:ring-sky-400">
    Solicitar cotización
  </a>
  <a class="rounded-xl px-6 py-3 text-base font-medium
            border border-white/25 text-white hover:bg-white/10">
    Probar gratis
  </a>
  <p class="text-xs sm:text-sm text-brand-200/70">
    Cotización sin costo. Prueba con límites del trial...
  </p>
</div>
```

### 7.4 Testimonios

```html
<div class="bg-white/5 border border-white/10 rounded-xl p-6">
  <div class="w-12 h-12 bg-brand-500 rounded-full flex items-center justify-center text-white font-bold">
    F  <!-- inicial del nombre -->
  </div>
  <span class="text-yellow-400">★★★★★</span>
  <blockquote class="text-brand-200/90 italic">"Cita del cliente..."</blockquote>
  <span class="text-brand-400 text-sm">40 empleados</span>
</div>
```

### 7.5 How It Works

```html
<section class="relative py-12 sm:py-16 md:py-20">
  <!-- Glow de fondo -->
  <div class="absolute inset-0 -z-10">
    <div class="mx-auto h-72 w-72 blur-3xl rounded-full opacity-20 bg-brand-600/40 translate-y-8" />
  </div>

  <!-- Badge sección -->
  <div class="inline-block bg-gray-800/50 text-gray-300 text-sm font-medium px-4 py-2 rounded-full">
    CÓMO FUNCIONA SISU
  </div>

  <!-- Card pasos -->
  <div class="bg-gray-900/50 border border-green-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8">
    <div class="flex items-start gap-3 sm:gap-4">
      <div class="w-7 h-7 sm:w-8 sm:h-8 bg-green-500/20 rounded-full flex items-center justify-center">
        <span class="text-green-400 font-bold">1</span>
      </div>
      <div>
        <h3 class="text-lg sm:text-xl font-bold text-white">⏱️ Título del paso</h3>
        <p class="text-sm sm:text-base text-gray-300">Descripción...</p>
      </div>
    </div>
  </div>
</section>
```

### 7.6 Service cards (glass hover)

```html
<article class="group relative overflow-hidden rounded-xl sm:rounded-2xl glass
                border border-white/15 p-4 sm:p-6
                transition-all duration-300
                hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-900/30">
  <div class="h-8 w-8 sm:h-10 sm:w-10 grid place-items-center rounded-lg
              bg-white/10 border border-white/15">
    <!-- icono brand-300 -->
  </div>
  <h3 class="text-lg sm:text-xl font-bold text-white">Título</h3>
  <p class="text-xs sm:text-sm text-brand-300/90">Subtítulo</p>
  <li class="flex gap-2 text-brand-200 text-sm sm:text-base">
    <CheckIcon class="text-brand-400" /> Beneficio
  </li>
</article>
```

### 7.7 Free tools cards

```html
<a class="glass-strong rounded-xl p-5 border border-white/15
          hover:border-cyan-400/40 transition-all hover:-translate-y-0.5 group">
  <div class="text-xs text-brand-300">Honduras</div>
  <div class="text-lg font-semibold text-white group-hover:text-brand-200">Título</div>
  <div class="text-sm text-brand-200/80 mt-1">Subtítulo</div>
</a>
```

### 7.8 AWS Certifications

```html
<section class="py-16 bg-white/5">
  <!-- Badge certificación -->
  <div class="inline-flex items-center gap-3 bg-blue-500/10 text-blue-400
              px-4 py-2 rounded-full border border-blue-500/20
              hover:-translate-y-0.5 transition-all duration-300">
    <img class="w-24 h-24" />
    <span class="text-sm font-medium text-white">AWS Solutions Architect</span>
  </div>

  <!-- Trust badge -->
  <div class="inline-flex items-center gap-3 bg-green-500/10 text-green-400
              px-4 py-2 rounded-full border border-green-500/20">
  Garantía de calidad y seguridad certificada por AWS
  </div>
</section>
```

### 7.9 Mail list (bloque oscuro sólido)

```html
<section class="py-12 sm:py-16 md:py-20 bg-gray-800">
  <h2 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white">
    Liderazgo, Productividad y Cultura Laboral para PyMEs
  </h2>
  <p class="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
    Descripción del newsletter...
  </p>
</section>
```

### 7.10 Footer (fondo claro — rompe el tema oscuro)

```html
<footer class="bg-white border-t border-gray-200 mt-auto">
  <h3 class="text-lg font-semibold text-gray-900">Contacto</h3>
  <a class="text-gray-600 hover:text-blue-600">email</a>
  <a class="text-gray-600 hover:text-green-600">WhatsApp</a>
  <!-- Redes: text-gray-400 hover:text-[color-red/social] -->
  <p class="text-sm text-gray-500">© 2026 Humano SISU</p>
</footer>
```

### 7.11 Cloud background (decorativo, fixed z-0)

- 3 capas de nubes SVG con stroke blanco semitransparente (`rgba(255,255,255,0.4–0.6)`)
- `fixed inset-0 pointer-events-none overflow-hidden z-0`
- Opacidad por nube: 0.16–0.20
- En mobile: solo capa 1 visible, más lenta

---

## 8. Botones — variantes usadas

| Variante | Clases |
|---|---|
| Primario hero | `bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold` |
| Secundario hero | `border border-white/25 text-white hover:bg-white/10 rounded-xl` |
| Activación | `bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-lg` |
| Login | `bg-brand-600 hover:bg-brand-700 text-white rounded-lg shadow-lg` |
| Nav pill | `text-brand-200 hover:text-white hover:bg-white/10 rounded-full` |
| Glass legacy | `.btn-primary` gradient `#3b82f6 → #2563eb` |
| Ghost legacy | `.btn-secondary` border `var(--primary-color)` |

---

## 9. Patrones de layout

```css
/* Grid testimonios / servicios */
grid md:grid-cols-3 gap-6 sm:gap-8   /* testimonios */
grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6   /* servicios */
grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6   /* calculadoras */

/* Glow decorativo detrás de secciones */
.pointer-events-none.absolute.inset-0.-z-10
  > .h-72.w-72.blur-3xl.rounded-full.opacity-20.bg-brand-600/40

/* Cards sobre fondo oscuro */
bg-white/5 border border-white/10 rounded-xl
bg-gray-900/50 border border-green-500/30 rounded-2xl
```

---

## 10. Assets visuales

| Asset | Uso |
|---|---|
| `/logo-humano-sisu.png` | Logo header |
| `/og-image.png` | Open Graph |
| `/1.png` – `/6.png` | Carrusel hero (screenshots producto + hardware) |
| `/image-aws-solutions-architect.png` | Badge certificación |
| `/image-aws-developer.png` | Badge certificación |
| `/image-aws-cloud-practitioner.png` | Badge certificación |

---

## 11. Inconsistencias conocidas (útiles para la IA)

1. **Footer claro vs body oscuro**: salto visual abrupto; el footer no usa glass ni brand tokens.
2. **Dos sistemas de botones**: Tailwind inline (`bg-sky-600`) + clases CSS legacy (`.btn-primary`).
3. **Mail list**: `bg-gray-800` sólido, distinto del glass del resto.
4. **CTAs con colores distintos**: sky (cotización), green (activación), brand (login) — sin jerarquía unificada.
5. **Títulos muy largos en mobile**: H1/H2 con `xl:text-6xl` pueden saturar pantallas pequeñas.
6. **Emojis en títulos y badges**: tono informal mezclado con estética enterprise/glass.

---

## 12. tailwind.config.js (extracto visual)

```js
theme: {
  extend: {
    colors: {
      brand: {
        50:'#eff6ff', 100:'#dbeafe', 200:'#bfdbfe', 300:'#93c5fd',
        400:'#60a5fa', 500:'#3b82f6', 600:'#2563eb', 700:'#1d4ed8',
        800:'#1e40af', 900:'#1e3a8a',
      },
      slate: { 900: '#0f172a' },
      indigo: { 900: '#312e81' },
    },
    backgroundImage: {
      'app-gradient': `
        radial-gradient(1200px 600px at 20% 10%, rgba(255,255,255,0.06), transparent 60%),
        radial-gradient(1000px 500px at 80% 90%, rgba(255,255,255,0.04), transparent 60%),
        linear-gradient(160deg, var(--bg-start), var(--bg-mid) 50%, var(--bg-end))
      `,
    },
    boxShadow: { glass: '0 8px 30px rgba(0,0,0,0.20)' },
    borderRadius: { lg: '16px', md: '12px', '2xl': '20px' },
    fontFamily: { montserrat: ['Montserrat', 'sans-serif'] },
  },
}
```

---

*Generado desde el codebase actual. Archivos fuente: `pages/index.tsx`, `components/landing/PublicPageShell.tsx`, `styles/landing-liquid.css`, `styles/globals.css`, `tailwind.config.js`.*
