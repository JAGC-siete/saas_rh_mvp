# Plan de Integración Saludable: Proxy Hikvision

## Problema Identificado

Existen **dos arquitecturas coexistiendo** que pueden estar causando conflictos:

1. **Servicio Proxy Separado** (`services/hikvision-proxy/`) - DevOps Uno
   - Servicio Node.js/Express independiente
   - Funcionalidades avanzadas: BullMQ, circuit breaker, rate limiting
   - Requiere despliegue separado y `HIKVISION_PROXY_URL`

2. **Integración en Next.js** (`lib/hikvision/sdk.ts`) - DevOps Dos
   - SDK integrado directamente en Next.js
   - Operaciones básicas: provisionamiento, health checks
   - Sin necesidad de servicio separado

## Conflictos Detectados

### 1. Endpoint de Status
**Archivo**: `pages/api/admin/devices/status.ts`
- **Línea 5**: Todavía usa `HIKVISION_PROXY_URL`
- **Problema**: Intenta llamar al servicio proxy separado que puede no estar desplegado

### 2. Referencias al Servicio Proxy
- Múltiples archivos de documentación mencionan `HIKVISION_PROXY_URL`
- El servicio proxy separado todavía existe en `services/hikvision-proxy/`
- Puede estar causando confusión sobre qué implementación usar

### 3. Exclusión en Build
**Archivo**: `next.config.js`
- `outputFileTracingExcludes` excluye `./services/**/*`
- Esto es correcto si el servicio se despliega por separado
- Pero puede causar problemas si se intenta usar desde Next.js

## Plan de Integración Saludable

### Opción A: Integración Completa en Next.js (Recomendada)

**Ventajas**:
- Un solo servicio en Railway
- Menor complejidad operacional
- Sin latencia de red entre servicios
- Más fácil de mantener

**Implementación**:

1. **Mantener SDK integrado** (`lib/hikvision/sdk.ts`)
   - ✅ Ya implementado
   - ✅ Funciona para operaciones básicas

2. **Migrar funcionalidades avanzadas del proxy a Next.js**:
   - BullMQ workers → API routes con background jobs
   - Circuit breaker → Implementar en `lib/hikvision/sdk.ts`
   - Rate limiting → Middleware de Next.js
   - Health checks → Endpoint `/api/hikvision/health`

3. **Eliminar servicio proxy separado**:
   - Mover código útil a `lib/hikvision/`
   - Eliminar `services/hikvision-proxy/`
   - Actualizar documentación

4. **Actualizar endpoints**:
   - `pages/api/admin/devices/status.ts` → Usar SDK integrado
   - Eliminar referencias a `HIKVISION_PROXY_URL`

### Opción B: Servicio Proxy Separado (Para Escalabilidad)

**Ventajas**:
- Escalabilidad independiente
- Aislamiento de recursos
- Mejor para alta carga

**Implementación**:

1. **Mantener servicio proxy separado** para operaciones avanzadas
2. **Usar integración Next.js** solo para operaciones básicas
3. **Clarificar responsabilidades**:
   - Next.js: Provisionamiento, configuración básica
   - Proxy: Sincronización masiva, health checks activos, event fallback

## Recomendación: Opción A (Integración Completa)

### Razones:

1. **El error 502 sugiere problemas de inicialización**:
   - Un solo servicio reduce puntos de fallo
   - Menos complejidad = menos bugs

2. **Ya tienes el SDK integrado funcionando**:
   - No necesitas el servicio separado para operaciones básicas
   - Puedes migrar funcionalidades avanzadas gradualmente

3. **Railway funciona mejor con un solo servicio**:
   - Menor costo
   - Más simple de monitorear
   - Health checks más confiables

### Pasos de Implementación:

#### Fase 1: Limpiar Referencias al Servicio Proxy Separado

1. **Actualizar `pages/api/admin/devices/status.ts`**:
```typescript
// ANTES:
const PROXY_SERVICE_URL = process.env.HIKVISION_PROXY_URL || 'http://localhost:3001';
const response = await fetch(`${PROXY_SERVICE_URL}/api/v1/hik/status/${deviceId}`);

// DESPUÉS:
import { HikvisionSDK } from '../../../../lib/hikvision/sdk';
const hikvisionClient = new HikvisionSDK({...});
const systemInfo = await hikvisionClient.getSystemInfo();
```

2. **Eliminar variable `HIKVISION_PROXY_URL`** de:
   - `env.example`
   - `railway.toml`
   - Documentación

3. **Actualizar documentación**:
   - Eliminar referencias al servicio proxy separado
   - Documentar que todo está integrado en Next.js

#### Fase 2: Migrar Funcionalidades Útiles (Opcional)

Si necesitas las funcionalidades avanzadas del proxy:

1. **Circuit Breaker**:
   - Mover lógica de `services/hikvision-proxy/src/hikvision.sdk.ts` a `lib/hikvision/sdk.ts`
   - Usar `opossum` directamente en el SDK

2. **Rate Limiting**:
   - Implementar en middleware de Next.js
   - O usar `express-rate-limit` en API routes si es necesario

3. **Background Jobs**:
   - Usar Vercel Cron o Railway Cron
   - O implementar workers con `node-cron`

#### Fase 3: Eliminar Servicio Proxy Separado

1. **Backup del código útil**:
   - Guardar lógica de circuit breaker, rate limiting, etc.

2. **Eliminar directorio**:
   - `rm -rf services/hikvision-proxy/`

3. **Actualizar `.dockerignore` y `tsconfig.json`**:
   - Ya no necesitan excluir `services/`

## Verificación de la Integración

### Checklist:

- [ ] `pages/api/admin/devices/status.ts` usa SDK integrado
- [ ] No hay referencias a `HIKVISION_PROXY_URL` en código
- [ ] Documentación actualizada
- [ ] Build de Next.js funciona sin errores
- [ ] Endpoint de webhooks funciona correctamente
- [ ] Provisionamiento de dispositivos funciona

## Impacto en el Error 502

### Posibles Causas Relacionadas:

1. **Conflicto de inicialización**:
   - Si el código intenta usar `HIKVISION_PROXY_URL` y no está configurada
   - Puede causar crash al iniciar el servidor

2. **Importaciones problemáticas**:
   - Si hay imports del servicio proxy que fallan
   - Puede causar que el módulo no se cargue

3. **Dependencias faltantes**:
   - Si el servicio proxy tiene dependencias que no están en Next.js
   - Puede causar errores de runtime

### Solución:

1. **Eliminar todas las referencias al servicio proxy separado**
2. **Usar solo la integración en Next.js**
3. **Verificar que el build incluya todas las dependencias necesarias**

## Próximos Pasos

1. ✅ Identificar conflictos (COMPLETADO)
2. ⏳ Actualizar `pages/api/admin/devices/status.ts`
3. ⏳ Eliminar referencias a `HIKVISION_PROXY_URL`
4. ⏳ Verificar que el build funcione
5. ⏳ Probar que el endpoint de webhooks funcione sin 502

