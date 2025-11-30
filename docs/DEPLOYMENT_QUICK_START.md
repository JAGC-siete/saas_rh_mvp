# 🚀 Solución Rápida: Desplegar Hikvision Proxy

## ✅ Opción Recomendada: Render.com (5 minutos)

Render es más simple que Railway y no tiene problemas de build.

### Pasos Rápidos:

1. **Ir a Render Dashboard:** https://dashboard.render.com
2. **New +** → **Web Service**
3. **Conectar repositorio** de GitHub
4. **Configuración:**
   - Name: `hikvision-proxy`
   - Root Directory: `services/hikvision-proxy`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Instance: `Free` (o `Starter` por $7/mes)

5. **Variables de Entorno:**
   ```
   NODE_ENV=production
   PORT=3001
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

6. **Crear servicio** y esperar el build (5-10 min)

7. **Copiar URL** (ej: `https://hikvision-proxy.onrender.com`)

8. **Configurar en Railway:**
   - Agregar variable: `HIKVISION_PROXY_URL=https://hikvision-proxy.onrender.com`

✅ **¡Listo!** El proxy estará funcionando.

---

## 🔧 Opción Alternativa: Workaround Temporal en Railway

Si quieres seguir usando Railway, deshabilita temporalmente type checking:

### En `next.config.js`:

```javascript
typescript: {
  ignoreBuildErrors: true, // ⚠️ Solo temporal
},
```

Luego intenta el deploy de nuevo.

---

## ⚡ Opción Más Rápida: Integrar en Next.js

Convertir el proxy en API routes dentro de Next.js (no requiere servicio separado).

**¿Quieres que lo implemente?** Esto eliminaría la necesidad de un servicio separado completamente.

