# Estado del Servicio Hikvision Proxy en Railway

## Verificación de Despliegue

### Análisis Realizado

1. **Estructura del Proyecto**
   - ✅ El servicio proxy existe en `services/hikvision-proxy/`
   - ✅ Tiene un `Dockerfile` configurado
   - ✅ Tiene un `package.json` con scripts de build y start
   - ✅ Está configurado para correr en el puerto 3001

2. **Configuración de Railway**
   - ⚠️ **NO hay un `railway.toml` específico para el servicio proxy**
   - ✅ El usuario está logueado en Railway CLI
   - ✅ Hay un proyecto activo: "sincere-cat"
   - ✅ Hay un servicio activo: "zesty-abundance" (probablemente el SaaS principal)

3. **Variables de Entorno Necesarias**
   El servicio proxy requiere estas variables:
   - `NEXT_PUBLIC_SUPABASE_URL` - URL de Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` - Service Role Key de Supabase
   - `REDIS_URL` - URL de conexión a Redis (opcional, default: redis://localhost:6379)
   - `PORT` - Puerto del servicio (default: 3001)
   - `OTEL_EXPORTER_OTLP_ENDPOINT` - Endpoint para OpenTelemetry (opcional)

## Conclusión

**❌ El servicio hikvision-proxy NO está desplegado actualmente en Railway**

### Evidencia:
1. Solo existe un servicio activo en Railway ("zesty-abundance") que corresponde al SaaS principal
2. No hay configuración de Railway específica para el servicio proxy
3. El servicio proxy necesita ser desplegado como un servicio separado en Railway

## Próximos Pasos para Desplegar el Proxy

### Opción 1: Servicio Separado en Railway (Recomendado)

1. **Crear un nuevo servicio en Railway**
   ```bash
   cd services/hikvision-proxy
   railway init
   ```

2. **Crear railway.toml** en `services/hikvision-proxy/`:
   ```toml
   [build]
   builder = "dockerfile"
   dockerfilePath = "Dockerfile"

   [deploy]
   healthcheckPath = "/health"
   healthcheckTimeout = 30
   restartPolicyType = "on_failure"
   numReplicas = 1

   [variables]
   PORT = "3001"
   NODE_ENV = "production"
   TZ = "America/Tegucigalpa"

   [railway]
   serviceType = "web"
   ```

3. **Configurar Variables de Entorno en Railway Dashboard**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `REDIS_URL` (si usas Redis en Railway o externo)

4. **Desplegar**:
   ```bash
   railway up
   ```

### Opción 2: Verificar si ya existe un servicio proxy

Si crees que el servicio proxy ya está desplegado pero con otro nombre, puedes:

1. **Listar todos los servicios del proyecto**:
   ```bash
   railway service list
   # o verificar en el dashboard de Railway
   ```

2. **Buscar servicios con nombres relacionados a "proxy" o "hikvision"**

3. **Verificar las URLs de los servicios desplegados**

## Verificación Manual

Para verificar si el servicio proxy está desplegado, puedes:

1. **Revisar el dashboard de Railway**:
   - Ve a https://railway.app
   - Selecciona el proyecto "sincere-cat"
   - Busca servicios relacionados con "proxy" o "hikvision"

2. **Intentar acceder a una URL conocida**:
   - Si conoces la URL del proxy, prueba: `curl https://[URL-DEL-PROXY]/health`

3. **Revisar los logs**:
   - Si hay un servicio, revisa sus logs para ver si está corriendo

## Recomendación

Si el servicio proxy **NO está desplegado**, se debe:
1. Crear el servicio en Railway siguiendo los pasos arriba
2. Obtener la URL del servicio desplegado
3. Configurar `HIKVISION_PROXY_URL` en el servicio principal del SaaS

Si el servicio proxy **YA está desplegado**, se debe:
1. Obtener la URL del servicio
2. Configurar `HIKVISION_PROXY_URL` en el servicio principal con esa URL

