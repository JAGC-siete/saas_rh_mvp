# Railway Environment Variables Setup - CORRECTA SOLUCIÓN

## 🐛 Problema Real

Las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` **NO están disponibles en Railway** después del build.

Next.js **requiere** que las variables `NEXT_PUBLIC_*` estén disponibles en **build time** para inyectarlas en el bundle. Si no están, el código compilado NO las tendrá.

## ✅ Solución CORRECTA (No Quick Fix)

### Paso 1: Verificar Variables en Railway

```bash
# En Railway Dashboard, estas variables DEBEN existir:
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...tu-key
```

### Paso 2: Verificar que Railway las Está Inyectando

Agrega este logging al inicio de `pages/_app.tsx`:

```typescript
if (typeof window === 'undefined') {
  console.log('🔍 Server-side environment check:', {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'
  })
}
```

### Paso 3: Agregar Runtime Injection para Railway

Si Railway no inyecta variables en build time, necesitamos otro approach:

**Archivo:** `pages/_app.tsx`

Agregar al inicio:

```typescript
// CRITICAL: Load env vars from Railway
if (typeof window === 'undefined') {
  // Server-side
  console.log('🔍 Checking environment variables...')
  
  // Railway injects at runtime, need to make them available to Next.js
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log('✅ Environment variables found at runtime')
  } else {
    console.error('❌ Environment variables MISSING at runtime')
    console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')))
  }
}
```

### Paso 4: Configurar next.config.js

**Archivo:** `next.config.js`

Asegurar que `webpack` inyecta variables:

```javascript
webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
  // For Railway - ensure NEXT_PUBLIC_ variables are available
  config.plugins.push(
    new webpack.DefinePlugin({
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    })
  )
  
  return config
}
```

## 🔍 Verificar el Problema

### En Railway Logs:

Deberías ver esto en los logs de Railway:

```
✅ Environment variables found at runtime
```

Si ves:
```
❌ Environment variables MISSING at runtime
```

Significa que Railway NO está inyectando las variables.

## 📋 Checklist Railway

1. ✅ Variables configuradas en Railway Dashboard
2. ✅ Nombre exacto: `NEXT_PUBLIC_SUPABASE_URL` (con NEXT_PUBLIC_)
3. ✅ Nombre exacto: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (con NEXT_PUBLIC_)
4. ✅ No hay espacios al inicio/final de los valores
5. ✅ Redeploy después de agregar variables

## 🚀 Cómo Aplicar la Solución

1. Agregar logging en `pages/_app.tsx` para verificar qué variables están disponibles
2. Revisar Railway logs después de deploy
3. Si variables están en Railway pero no en build, aplicar `next.config.js` fix
4. Si variables NO están en Railway, agregarlas en Dashboard

## ⚠️ IMPORTANTE

Este NO es un problema de código. Es un problema de **configuración de Railway**.

Las variables `NEXT_PUBLIC_*` son inyectadas en **build time** por Next.js. Si no están disponibles durante `npm run build`, **nunca** estarán en el bundle.

**Railway DEBE tener estas variables configuradas ANTES del build.**
