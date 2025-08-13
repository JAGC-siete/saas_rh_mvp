# Configuración del Logo para Railway + Cloudflare + Supabase

## ✅ Estado Actual: CONFIGURADO CORRECTAMENTE

### Ubicación del Logo
- **Ruta física**: `/public/logo-humano-sisu.png`
- **Tamaño**: 217 KB
- **Última modificación**: 13 de agosto de 2025

### Referencias en el Código
1. **`pages/landing.tsx`** - Header principal de la landing page
2. **`components/DashboardLayout.tsx`** - Sidebar del dashboard

### Configuración Técnica
- **Next.js**: Configurado con `output: 'standalone'` para Railway
- **Ruta de acceso**: `/logo-humano-sisu.png` (desde la raíz del dominio)
- **Tamaño en header**: `h-12 w-auto` (responsive)
- **Tamaño en sidebar**: `h-8 w-auto` (compacto)

## 🚀 Proceso de Despliegue

### 1. Push a GitHub
```bash
git add .
git commit -m "feat: implementar logo físico en lugar de texto"
git push origin main
```

### 2. Despliegue Automático
- Railway detecta el push y ejecuta el build automáticamente
- El logo en `/public` se empaqueta durante el build
- Se sirve como archivo estático desde la raíz del dominio

### 3. Verificación del Despliegue
- **URL de prueba**: `https://humanosisu.net/logo-humano-sisu.png`
- **Si se ve el logo**: Despliegue exitoso ✅
- **Si no se ve**: Verificar que esté en `/public` en el momento del build

## 🔧 Script de Verificación

Ejecuta este comando para verificar la configuración:
```bash
node scripts/verify-logo-deployment.js
```

## 📋 Checklist de Despliegue

- [x] Logo en `/public/logo-humano-sisu.png`
- [x] Logo referenciado en 2 archivos
- [x] Next.js configurado para Railway
- [x] Script de build disponible

## 💡 Mejores Prácticas Implementadas

### ✅ Lo que SÍ se hace:
- Logo almacenado en `/public` (archivo estático)
- Rutas relativas desde la raíz (`/logo-humano-sisu.png`)
- Configuración `output: 'standalone'` para Railway
- Tamaños responsivos y accesibles

### ❌ Lo que NO se hace:
- No usar Supabase Storage para logos fijos de UI
- No usar buckets externos
- No manejar permisos innecesarios
- No usar URLs firmadas

## 🌐 Flujo de Servido

```
Usuario → Cloudflare → Railway → Next.js → /public/logo-humano-sisu.png
```

1. **Cloudflare**: Cachea la respuesta de Railway
2. **Railway**: Sirve la aplicación Next.js
3. **Next.js**: Sirve archivos estáticos desde `/public`
4. **Logo**: Accesible como `/logo-humano-sisu.png`

## 🔍 Solución de Problemas

### El logo no se ve después del deploy:
1. Verificar que esté en `/public` en el repositorio
2. Verificar que Railway esté haciendo build desde el commit correcto
3. Verificar que no haya errores en el build de Railway
4. Verificar la URL directa: `https://humanosisu.net/logo-humano-sisu.png`

### El logo se ve en local pero no en producción:
1. Verificar que esté en `/public` (no en `.gitignore`)
2. Verificar que el commit incluya el archivo
3. Verificar que Railway esté haciendo build completo

## 📚 Referencias

- [Next.js Static File Serving](https://nextjs.org/docs/basic-features/static-file-serving)
- [Railway Deployment Best Practices](https://docs.railway.app/deploy/deployments)
- [Cloudflare Caching](https://developers.cloudflare.com/cache/)

---

**Última actualización**: 13 de agosto de 2025  
**Estado**: ✅ Configurado y verificado  
**Próximo paso**: Hacer push a GitHub para desplegar
