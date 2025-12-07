# 🚀 Guía de Despliegue - Hikvision Proxy Service

## Prerequisitos

- Railway CLI instalado: `npm install -g @railway/cli`
- Cuenta de Railway y proyecto creado
- Variables de entorno configuradas (ver abajo)

## Despliegue Rápido

### Opción 1: Usar el Script Automatizado (Recomendado)

```bash
# Desde la raíz del proyecto
./scripts/deploy-hikvision-proxy.sh
```

El script te guiará a través del proceso de despliegue.

### Opción 2: Despliegue Manual

1. **Navegar al directorio del servicio**:
   ```bash
   cd services/hikvision-proxy
   ```

2. **Vincular con Railway** (si es primera vez):
   ```bash
   railway link
   ```
   - Si no tienes un servicio, créalo primero en el dashboard de Railway

3. **Configurar Variables de Entorno**:
   ```bash
   railway variables set NEXT_PUBLIC_SUPABASE_URL="tu_url_supabase"
   railway variables set SUPABASE_SERVICE_ROLE_KEY="tu_service_role_key"
   railway variables set PORT="3001"
   ```
   
   Opcional (para colas BullMQ):
   ```bash
   railway variables set REDIS_URL="redis://..."
   ```

4. **Desplegar**:
   ```bash
   railway up
   ```

## Variables de Entorno Requeridas

### Obligatorias

- `NEXT_PUBLIC_SUPABASE_URL` - URL de tu proyecto Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Service Role Key de Supabase (secreto)

### Opcionales

- `PORT` - Puerto del servicio (default: 3001)
- `REDIS_URL` - URL de Redis para BullMQ (si usas colas)
- `OTEL_EXPORTER_OTLP_ENDPOINT` - Endpoint para OpenTelemetry tracing

## Verificar el Despliegue

1. **Obtener la URL del servicio**:
   ```bash
   railway domain
   ```

2. **Probar el health check**:
   ```bash
   curl https://tu-proxy-service.railway.app/health
   ```
   
   Deberías recibir:
   ```json
   {"status":"ok","timestamp":"2025-..."}
   ```

3. **Revisar logs**:
   ```bash
   railway logs
   ```

## Configurar en el Servicio Principal del SaaS

Una vez desplegado, obtén la URL del servicio proxy y configúrala en tu servicio principal:

```bash
cd /path/to/saas-proyecto
railway variables set HIKVISION_PROXY_URL="https://tu-proxy-service.railway.app"
```

## Troubleshooting

### Error: "Supabase URL and Service Role Key are required"

- Verifica que las variables estén configuradas: `railway variables`
- Asegúrate de usar el nombre correcto: `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`

### Error: Connection refused al proxy

- Verifica que el servicio esté corriendo: `railway status`
- Revisa los logs: `railway logs`
- Confirma que el puerto 3001 esté expuesto correctamente

### El servicio no responde

- Verifica el health check: `curl https://tu-url/health`
- Revisa que el endpoint `/health` esté funcionando
- Confirma que Railway haya completado el despliegue exitosamente

## Estructura del Servicio

```
services/hikvision-proxy/
├── railway.toml          # Configuración de Railway
├── Dockerfile            # Imagen Docker
├── package.json          # Dependencias Node.js
├── src/                  # Código fuente TypeScript
└── dist/                 # Código compilado (generado)
```

## Endpoints Disponibles

- `GET /health` - Health check
- `POST /api/v1/hik/provision` - Provisionar dispositivo
- `GET /api/v1/devices/:deviceId/status` - Estado del dispositivo







