# Solución para Error de Docker Build en Railway

## Error:
```
ERROR: failed to build: listing workers for Build: failed to list workers: 
Unavailable: connection error: desc = "error reading server preface: 
read unix @->/run/docker.sock: use of closed network connection"
```

## Optimizaciones Aplicadas

### 1. Dockerfile Optimizado
- Mejorado el caché de dependencias
- Reducido el tamaño del build context
- Optimizado multi-stage build

### 2. .dockerignore Mejorado
- Excluye archivos de documentación grandes
- Excluye tests y migrations
- Excluye scripts innecesarios

## Soluciones si el Error Persiste

### Opción 1: Reintentar el Deploy
El error suele ser temporal. Simplemente:
1. Ve a Railway Dashboard
2. Cancela el deploy actual si está corriendo
3. Haz un nuevo deploy

### Opción 2: Verificar Estado de Railway
1. Revisa el status de Railway: https://status.railway.app
2. Si hay incidentes reportados, espera a que se resuelvan

### Opción 3: Usar Builder Nativo de Railway (Alternativa)
Si el problema persiste, puedes cambiar a usar el builder nativo de Railway en lugar de Dockerfile:

```toml
[build]
builder = "nixpacks"
# o
builder = "heroku"
```

Y actualizar `railway.toml`:
```toml
[build]
builder = "nixpacks"
buildCommand = "npm run build"
```

### Opción 4: Verificar Variables de Entorno
Asegúrate de que todas las variables de entorno requeridas estén configuradas en Railway Dashboard:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- DATABASE_URL
- TRIAL_DURATION_DAYS (opcional, default: 7)
- TRIAL_COOLDOWN_DAYS (opcional, default: 30)

### Opción 5: Limpiar Build Cache
En Railway Dashboard:
1. Ve a Settings > Build
2. Limpia el build cache
3. Haz un nuevo deploy

### Opción 6: Verificar Límites de Railway
- Verifica que no hayas excedido los límites de build time
- Considera upgrade de plan si los builds son muy largos

## Prevención

Las optimizaciones aplicadas deberían prevenir este error:
- ✅ Build context más pequeño (archivos excluidos en .dockerignore)
- ✅ Mejor caché de dependencias
- ✅ Build más rápido y eficiente

## Notas

- Este error generalmente es temporal y se resuelve con un reintento
- Si persiste después de varios intentos, contacta a Railway support
- El build optimizado debería ser más rápido y confiable

