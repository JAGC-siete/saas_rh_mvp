# Solución: Error "tls handshake eof" durante el Build

## Problema

El error `tls handshake eof` durante el build de Next.js en Railway indica un problema de conectividad durante la verificación de tipos de TypeScript.

## Causas Posibles

1. **Problemas temporales de red** durante el build
2. **Timeouts de conexión** a servicios externos durante la verificación de tipos
3. **Variables de entorno faltantes** que causan intentos de conexión fallidos

## Soluciones

### Solución 1: Reintentar el Build (Primera opción)

El error puede ser temporal. Simplemente reintenta el build:

```bash
railway up
```

### Solución 2: Verificar Variables de Entorno

Asegúrate de que todas las variables de entorno estén configuradas antes del build:

```bash
railway variables
```

Verifica especialmente:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NODE_ENV=production`

### Solución 3: Configurar Variables de Entorno de Build

Si las variables no están disponibles durante el build, configúralas en Railway Dashboard antes de hacer el build.

### Solución 4: Ignorar Errores de Tipo Temporalmente (Solo si es necesario)

Si el problema persiste, puedes ignorar temporalmente los errores de tipo durante el build editando `next.config.js`:

```javascript
typescript: {
  ignoreBuildErrors: true, // Solo usar temporalmente
},
```

**⚠️ Advertencia**: Esto puede ocultar errores reales de TypeScript. Úsalo solo como último recurso.

### Solución 5: Limpiar Cache y Rebuild

Si el problema persiste, intenta limpiar el cache:

```bash
# En Railway, configura esta variable:
NIXPACKS_CACHE=false
```

Luego haz un nuevo deploy.

## Prevención

1. **Asegúrate de que todas las variables de entorno estén configuradas** antes del build
2. **No hagas conexiones a servicios externos** durante el build
3. **Usa variables de entorno** en lugar de hardcodear URLs o credenciales

## Notas

- El error ocurre durante "Checking validity of types", lo que significa que TypeScript está validando tipos
- Si hay código que intenta conectarse a servicios durante el import o inicialización de módulos, esto puede causar el error
- Asegúrate de que no haya código ejecutándose durante el import que requiera conectividad de red

