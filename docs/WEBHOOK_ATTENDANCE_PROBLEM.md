# Problema Identificado en /api/webhooks/attendance

## Commit Problemático

**Commit `c2f239cf`** - `feat(hikvision): Implement Secure Proxy Service for Device Mgmt (Phase 0-1)`

### Cambio Problemático

**ANTES (Funcional)**:
```typescript
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

// ...
const supabase = createPagesServerClient({ req, res });
```

**DESPUÉS (Problemático)**:
```typescript
import { createAdminClient } from '../../../lib/supabase/server';

// ...
const supabase = createAdminClient();
```

## Análisis del Problema

1. **`createPagesServerClient`** requiere `req` y `res` como parámetros y funciona correctamente
2. **`createAdminClient`** no requiere parámetros pero puede estar crasheando el servidor cuando:
   - Se llama durante la inicialización del módulo
   - Las variables de entorno no están disponibles
   - Hay un problema con la importación de `lib/supabase/server`

## Síntomas

- Error 502 Bad Gateway en todas las requests a `/api/webhooks/attendance`
- Tiempo de respuesta extremadamente bajo (1-7ms) indica que el servidor crashea antes de procesar
- El servidor no puede iniciar correctamente cuando se carga este endpoint

## Solución Propuesta

### Opción 1: Revertir a `createPagesServerClient` (Recomendado)

Volver a usar `createPagesServerClient` que funcionaba antes del commit `c2f239cf`:

```typescript
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

// ...
const supabase = createPagesServerClient({ req, res });
```

**Ventajas**:
- Era la versión que funcionaba
- No requiere cambios en otras partes del código
- Más estable para webhooks que no requieren autenticación de usuario

### Opción 2: Mejorar `createAdminClient` para webhooks

Si necesitamos usar `createAdminClient`, debemos asegurarnos de que:
- No se llame durante la inicialización del módulo
- Maneje correctamente los errores sin crashear el servidor
- Tenga un fallback si las variables de entorno no están disponibles

## Commits Relevantes

- **c2f239cf~1**: Última versión funcional con `createPagesServerClient`
- **c2f239cf**: Commit problemático que introdujo `createAdminClient`
- **f706b6a8**: Intentó agregar try-catch pero el problema persiste

## Próximos Pasos

1. Revertir a `createPagesServerClient` en el endpoint de webhooks
2. Verificar que el servidor inicie correctamente
3. Probar que las requests funcionen
4. Si es necesario, migrar gradualmente a `createAdminClient` con mejor manejo de errores

