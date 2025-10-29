# Solución: Variables de Entorno en Railway

## 🎯 Problema Real

Las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` NO están disponibles en producción en Railway.

Error: "Application configuration error. Please contact system administrator."

## 📋 Diagnóstico

Next.js requiere que las variables `NEXT_PUBLIC_*` estén disponibles en **build time**. Si Railway no las inyecta durante `npm run build`, el bundle NO las tendrá.

### Pasos para Diagnosticar en Railway

1. **Verifica los logs de Railway después del deploy**
2. Busca: `🔍 Server-side environment check:`
3. Si ves `❌ Missing` = Las variables NO están en Railway

## ✅ Solución CORRECTA

### Opción A: Variables en Railway (CORRECTO)

**Railway Dashboard → Variables:**

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...tu-key
```

**IMPORTANTE:**
- Nombre exacto: `NEXT_PUBLIC_SUPABASE_URL` (con `NEXT_PUBLIC_` al inicio)
- Nombre exacto: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (con `NEXT_PUBLIC_` al inicio)
- Sin espacios al inicio o final
- Redeploy después de agregar

### Opción B: Runtime Injection (Si Railway falla)

Si Railway no inyecta variables durante build, el código **YA tiene fallback**:

1. `pages/api/client-env.ts` - Expone variables al cliente
2. `lib/env-client.ts` - Carga variables dinámicamente
3. `lib/supabase/client.ts` - Busca en múltiples fuentes

El problema es que las variables NO ESTÁN en Railway.

## 🔧 Cambios Realizados

### 1. `pages/_app.tsx`
- Agregado logging para ver qué variables están disponibles
- Server-side check al inicio
- Client-side fallback si faltan variables

### 2. `pages/api/client-env.ts`
- Logging para debugging en Railway
- Expone variables de forma segura al cliente

### 3. `next.config.js`
- Ya tiene configuración para inyectar variables en webpack
- `DefinePlugin` para forzar variables en cliente

## 📊 Verificación Post-Deploy

En Railway logs, deberías ver:

```
🔍 Server-side environment check: {
  NEXT_PUBLIC_SUPABASE_URL: '✅ Set',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: '✅ Set'
}
📋 All SUPABASE env vars: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
```

Si ves `❌ Missing`, significa que las variables NO están en Railway.

## 🚀 Siguiente Paso

1. Verifica Railway Dashboard que las variables estén configuradas
2. Redeploy después de agregar variables
3. Revisa logs de Railway para confirmar
4. Si sigue fallando, ejecuta script de debugging

### Comando para verificar en Railway:

En Railway Dashboard → Variables, asegúrate de tener:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Y que NO tengas:
- ❌ `SUPABASE_URL` (sin NEXT_PUBLIC_)
- ❌ Espacios en los valores
- ❌ Variables duplicadas con nombres similares

## ⚠️ NOTA CRÍTICA

Este NO es un problema de código. Es 100% configuración de Railway.

Las variables `NEXT_PUBLIC_*` deben estar en Railway Dashboard antes del build.

Si no están allí, nada funcionará, sin importar cuánto código agregues.
