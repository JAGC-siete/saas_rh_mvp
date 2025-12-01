# Análisis del Error 502 Bad Gateway

## Resumen del Problema

El sitio `humanosisu.net` está experimentando errores 502 Bad Gateway, específicamente en la ruta `/favicon.ico`. Este error indica que Cloudflare no puede comunicarse correctamente con el servidor de Railway.

## Commits Problemáticos Identificados

### 1. Commit `5a1bbf74` - **PRINCIPAL SUSPECTO**
**Fecha**: Sun Nov 30 17:04:03 2025  
**Mensaje**: `feat: Integrar proxy Hikvision como API routes de Next.js`

**Cambios críticos en `next.config.js`**:
- ❌ **Eliminó `publicRuntimeConfig`** (deprecado en Next.js 13+, pero estaba presente antes)
- ✅ Agregó `outputFileTracingExcludes` para excluir `./services/**/*`
- ✅ Agregó configuración de TypeScript (`typescript.ignoreBuildErrors: false`)
- ✅ Agregó `watchOptions` en webpack para ignorar `services/**`

**Configuración ANTES del commit** (funcionando):
- Tenía `publicRuntimeConfig` con variables de Supabase
- No tenía `outputFileTracingExcludes`
- No tenía configuración de TypeScript explícita

**Configuración DESPUÉS del commit**:
- Eliminó `publicRuntimeConfig` (correcto, está deprecado)
- Agregó exclusiones de servicios
- Las variables de entorno se manejan solo con `env` y `webpack.DefinePlugin`

**Impacto potencial**:
- La eliminación de `publicRuntimeConfig` es correcta (deprecado), pero el cambio podría haber requerido un rebuild completo
- Los cambios en el proceso de build podrían haber afectado el output standalone

### 2. Commit `876eec00` - **RELACIONADO**
**Fecha**: Sun Nov 30 16:04:18 2025  
**Mensaje**: `fix: excluir servicios del build de Next.js para evitar errores de compilación`

**Cambios**:
- Excluyó `services/**/*` en `tsconfig.json`
- Agregó `outputFileTracingExcludes` en `next.config.js`
- Excluyó `services/` en `.dockerignore`

**Impacto**: Cambios en el proceso de build que podrían afectar el output final.

### 3. Commit `6a7c63e6` - **FIX INTENTADO**
**Fecha**: Mon Dec 1 10:46:53 2025  
**Mensaje**: `urgent fix Added a rewrite in next.config.js that serves /logo-humano-sisu.png when browsers request /favicon.ico`

**Cambio**:
- ✅ Agregó rewrite de `/favicon.ico` → `/logo-humano-sisu.png`

**Estado**: El fix fue agregado pero luego eliminado en cambios locales sin commitear.

## Configuración Funcional (Working Configuration)

### next.config.js - Rewrites Necesarios

```javascript
async rewrites() {
  return [
    // Rewrite /favicon.ico to logo to prevent 502 errors
    // Browsers automatically request /favicon.ico, and if it doesn't exist,
    // it can cause 502 errors when behind a proxy like Cloudflare
    {
      source: '/favicon.ico',
      destination: '/logo-humano-sisu.png',
    },
  ]
},
```

### Configuración Crítica para Railway

1. **Output standalone**: `output: 'standalone'` ✅ (presente)
2. **Health check**: `/api/health` ✅ (configurado en railway.toml)
3. **Port**: `8080` ✅ (configurado)
4. **Hostname**: `0.0.0.0` ✅ (configurado)

## Posibles Causas del 502

1. **Falta de favicon.ico**: Los navegadores solicitan automáticamente `/favicon.ico`. Si no existe y no hay rewrite, puede causar 502.
2. **Problemas de build**: Los cambios en `outputFileTracingExcludes` podrían haber afectado qué archivos se incluyen en el build standalone.
3. **Variables de entorno**: La eliminación de `publicRuntimeConfig` podría haber afectado cómo se inyectan las variables en runtime.
4. **Servidor no inicia**: El servidor de Railway podría no estar iniciando correctamente debido a errores en el build o configuración.

## Solución Aplicada

✅ **Restaurado el rewrite del favicon** en `next.config.js`

## Próximos Pasos para Diagnóstico

1. Verificar logs de Railway para ver si el servidor está iniciando
2. Verificar que el build se complete correctamente
3. Verificar que todas las variables de entorno estén configuradas en Railway
4. Probar el endpoint `/api/health` directamente
5. Verificar que el archivo `/logo-humano-sisu.png` exista en `/public`

## Referencias

- Commit problemático: `5a1bbf74`
- Commit con fix: `6a7c63e6`
- Archivo afectado: `next.config.js`
- Archivo de configuración Railway: `railway.toml`
- Dockerfile: `Dockerfile`

