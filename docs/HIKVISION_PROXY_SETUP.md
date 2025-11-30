# 🔧 Configuración del Servicio Hikvision Proxy

## Configurar Variable de Entorno HIKVISION_PROXY_URL

La variable `HIKVISION_PROXY_URL` debe configurarse en Railway para que el SaaS pueda comunicarse con el servicio proxy de Hikvision.

### Pasos para Configurar en Railway

1. **Accede al Dashboard de Railway**
   - Ve a https://railway.app
   - Inicia sesión con tu cuenta

2. **Selecciona tu Proyecto**
   - Encuentra el proyecto del SaaS principal (no el proxy)

3. **Ve a Variables de Entorno**
   - Haz clic en tu servicio del SaaS
   - Ve a la pestaña "Variables"
   - O usa la sección "Variables" en el panel lateral

4. **Agrega la Variable**
   - Haz clic en "+ New Variable"
   - Nombre: `HIKVISION_PROXY_URL`
   - Valor: La URL completa de tu servicio proxy desplegado
     - Ejemplo: `https://hikvision-proxy-production.up.railway.app`
     - O si está en el mismo proyecto: `https://your-service.railway.app`
   - Haz clic en "Add"

5. **Verifica la Configuración**
   - La variable debería aparecer en la lista
   - Asegúrate de que no tenga espacios extra o caracteres especiales

### Ejemplo de Valor

Si tu servicio proxy está desplegado en Railway, la URL será algo como:
```
https://hikvision-proxy-production.up.railway.app
```

O si prefieres usar el dominio personalizado:
```
https://proxy.humanosisu.net
```

### Configuración Local (Desarrollo)

Para desarrollo local, crea o edita el archivo `.env.local`:

```bash
HIKVISION_PROXY_URL=http://localhost:3001
```

### Verificar que Funciona

Después de configurar la variable, verifica que el servicio puede comunicarse:

```bash
# Desde tu máquina local o desde Railway logs
curl https://your-saas-domain.com/api/admin/devices/provision
```

### Notas Importantes

- ⚠️ **La variable debe configurarse ANTES de intentar provisionar dispositivos**
- 🔄 **Si cambias la URL del proxy, necesitas redeployar el SaaS para que tome el nuevo valor**
- 🔒 **No expongas esta variable públicamente si contiene información sensible**

## Troubleshooting

### Error: "Failed to provision device via proxy"

1. Verifica que `HIKVISION_PROXY_URL` esté configurada correctamente
2. Verifica que el servicio proxy esté corriendo y accesible
3. Verifica los logs del servicio proxy en Railway
4. Asegúrate de que la URL sea accesible desde internet (no localhost si estás en producción)

### Error: "Connection refused" o "ECONNREFUSED"

- El servicio proxy no está corriendo
- La URL está mal configurada
- Hay un problema de firewall o red entre servicios

