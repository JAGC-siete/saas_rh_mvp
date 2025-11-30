# Desplegar Hikvision Proxy en Render.com

## Pasos para Desplegar

### 1. Crear Servicio en Render

1. Ve a [Render Dashboard](https://dashboard.render.com)
2. Click en **"New +"** → **"Web Service"**
3. Conecta tu repositorio de GitHub
4. Selecciona el repositorio `saas-proyecto`

### 2. Configurar el Servicio

**Configuración básica:**
- **Name:** `hikvision-proxy`
- **Region:** `Oregon` (o la más cercana)
- **Branch:** `develop` (o la rama que uses)
- **Root Directory:** `services/hikvision-proxy`
- **Runtime:** `Node`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Instance Type:** `Free` (para empezar)

### 3. Configurar Variables de Entorno

En la sección **"Environment"**, agrega:

```
NODE_ENV=production
PORT=3001
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 4. Desplegar

1. Click en **"Create Web Service"**
2. Espera a que el build termine (5-10 minutos)
3. Copia la URL generada (ejemplo: `https://hikvision-proxy.onrender.com`)

### 5. Configurar Variable en Railway

En tu servicio principal de Railway, agrega:

```
HIKVISION_PROXY_URL=https://hikvision-proxy.onrender.com
```

### 6. Verificar

```bash
curl https://hikvision-proxy.onrender.com/health
```

Debería retornar:
```json
{"status":"ok","timestamp":"2025-01-30T..."}
```

## Ventajas de Render

- ✅ Build automático desde GitHub
- ✅ Sin problemas de TLS handshake
- ✅ Variables de entorno fáciles de configurar
- ✅ Plan gratuito disponible
- ✅ Auto-deploy en cada push

## Notas Importantes

- ⚠️ El servicio gratuito puede "dormirse" después de 15 minutos de inactividad
- ⚠️ Para producción, considera el plan pago ($7/mes)
- ⚠️ El primer deploy puede tardar más tiempo

