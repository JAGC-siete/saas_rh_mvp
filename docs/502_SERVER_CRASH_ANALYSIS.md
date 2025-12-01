# Análisis del Crash del Servidor (502 Bad Gateway)

## Síntomas

- **Error**: 502 Bad Gateway en todas las requests
- **Tiempo de respuesta**: 1-5ms (extremadamente rápido, indica que el servidor ni siquiera procesa la request)
- **Endpoint afectado**: `/api/webhooks/attendance` (y probablemente todos los endpoints)
- **Logs de Railway**: Múltiples requests retornando 502 inmediatamente

## Diagnóstico

Los tiempos de respuesta de 1-5ms indican que:
1. El servidor **NO está procesando las requests**
2. El servidor probablemente **está crasheando al iniciar**
3. O el servidor **no está iniciando correctamente**

## Posibles Causas

### 1. Variables de Entorno Faltantes
El servidor podría estar crasheando si faltan variables de entorno críticas:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`

**Verificación**: Revisar logs de Railway para ver si hay errores de variables de entorno faltantes.

### 2. Error en el Código de Inicialización
El código en `lib/supabase/server.ts` lanza errores si faltan variables:
```typescript
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables are not configured')
}
```

Si esto se ejecuta durante el inicio del servidor, podría causar que el servidor crashee.

### 3. Problema con el Build Standalone
El build standalone podría no estar incluyendo todos los archivos necesarios, especialmente después de los cambios en `outputFileTracingExcludes`.

### 4. Problema con el Endpoint de Webhooks
El endpoint `/api/webhooks/attendance` usa `formidable` para parsear multipart/form-data. Si hay un problema con esta librería o con el parsing, podría causar que el servidor crashee.

## Soluciones Propuestas

### Solución 1: Verificar Variables de Entorno en Railway
1. Ir a Railway Dashboard
2. Verificar que todas las variables de entorno estén configuradas
3. Especialmente verificar:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`

### Solución 2: Agregar Manejo de Errores en el Servidor
Modificar el código para que el servidor no crashee si faltan variables de entorno, sino que registre el error y continúe.

### Solución 3: Verificar Logs de Railway
Revisar los logs completos de Railway para ver el error exacto que está causando el crash.

### Solución 4: Agregar Health Check Mejorado
Asegurar que el health check endpoint funcione correctamente y no requiera variables de entorno que puedan faltar.

## Próximos Pasos

1. **Revisar logs de Railway** para identificar el error exacto
2. **Verificar variables de entorno** en Railway Dashboard
3. **Agregar manejo de errores** en el código de inicialización
4. **Probar el servidor localmente** con las mismas variables de entorno

## Referencias

- Dockerfile: `Dockerfile` (línea 74: `CMD ["node", "server.js"]`)
- Server standalone: `.next/standalone/server.js`
- Endpoint problemático: `pages/api/webhooks/attendance.ts`
- Configuración de variables: `railway.toml`

