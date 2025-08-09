# 🌐 GUÍA COMPLETA DE CONFIGURACIÓN DNS PARA app.humanosisu.net

## 📋 PRERREQUISITOS
- Acceso al panel de administración de tu proveedor de DNS
- Dominio `humanosisu.net` ya configurado
- Deployment activo en Railway/Vercel

## 🔧 CONFIGURACIÓN ESPECÍFICA: CLOUDFLARE + RAILWAY + SUPABASE

### **PASO 1: Railway Dashboard (Primero)**

1. **Abrir Railway Dashboard:**
   ```
   https://railway.app/dashboard
   ```

2. **Ir a tu proyecto HR SaaS:**
   - Seleccionar tu proyecto `saas_rh_mvp`
   - Click en `Settings`
   - Click en `Domains`

3. **Agregar dominio:**
   ```
   Add Domain: app.humanosisu.net
   ```

4. **Railway te dará ESTA información:**
   ```
   Tu dominio de Railway: algo-como-saas-rh-mvp-production.up.railway.app
   Estado: "Waiting for DNS configuration"
   ```

### **PASO 2: Cloudflare Dashboard (Segundo)**

1. **Login en Cloudflare:**
   ```
   https://dash.cloudflare.com
   ```

2. **Seleccionar dominio `humanosisu.net`**

3. **Ir a DNS → Records**

4. **Agregar CNAME Record:**
   ```
   Type: CNAME
   Name: app
   Target: saas-rh-mvp-production.up.railway.app
   Proxy status: 🟠 DNS only (IMPORTANTE: NO PROXY inicialmente)
   TTL: Auto
   ```

5. **Click Save**

### **PASO 3: Verificar en Railway (Tercero)**

1. **Volver a Railway Dashboard**
2. **Refrescar la página de Domains**
3. **Debería cambiar a:**
   ```
   Status: ✅ Active
   SSL: ✅ Provisioning (esperar 5-10 min)
   ```

### **CONFIGURACIÓN DETALLADA EN CLOUDFLARE:**

#### **DNS Records que debes tener:**

```dns
# Dominio principal (ya configurado)
Type: A
Name: @
Content: [IP de Railway para dominio principal]
Proxy: 🟠 DNS only

# Subdominio www (ya configurado)  
Type: CNAME
Name: www
Content: humanosisu.net
Proxy: 🟠 DNS only

# NUEVO: Subdominio app
Type: CNAME
Name: app
Content: saas-rh-mvp-production.up.railway.app
Proxy: 🟠 DNS only
```

## 🛠️ PASOS ESPECÍFICOS CLOUDFLARE

### **1. Encontrar tu dominio Railway:**

```bash
# En terminal, desde tu proyecto:
railway status

# O ver en Railway Dashboard → Settings → Domains
# Buscas algo como: saas-rh-mvp-production.up.railway.app
```

### **2. Cloudflare DNS Configuration:**

**Screenshots mentales para Cloudflare:**

```
Dashboard → Select humanosisu.net → DNS → Records

[Add record]
Type: [CNAME ▼]
Name: app
Target: saas-rh-mvp-production.up.railway.app
Proxy status: [🟠 DNS only] ← IMPORTANTE: NO naranja
TTL: [Auto ▼]

[Save]
```

### **3. Verificar configuración:**

```bash
# 1. En Cloudflare: Debería aparecer el nuevo record
# 2. En Railway: Status debería cambiar a "Active"
# 3. Test DNS:
nslookup app.humanosisu.net
```

## ⚠️ ERRORES COMUNES CON CLOUDFLARE

### **❌ ERROR 1: Proxy habilitado**
```
❌ Proxy status: 🟠 Proxied (naranja)
✅ Correcto: 🟠 DNS only (gris)
```

### **❌ ERROR 2: Target incorrecto**
```
❌ Target: railway.app
❌ Target: app.humanosisu.net
✅ Target: TU-PROYECTO-ESPECÍFICO.up.railway.app
```

### **❌ ERROR 3: Name incorrecto**
```
❌ Name: app.humanosisu.net
✅ Name: app
```

## 🔍 VERIFICACIÓN PASO A PASO

### **PASO 1: Verificar tu dominio Railway actual**

```bash
# Desde tu terminal en el proyecto:
cd /Users/jorgearturo/saas-proyecto
railway status

# Debería mostrarte algo como:
# Domain: saas-rh-mvp-production.up.railway.app
# Status: Active
```

### **PASO 2: Verificar DNS desde terminal**

```bash
# Verificar que el DNS se configura correctamente
nslookup app.humanosisu.net

# Resultado esperado:
# app.humanosisu.net canonical name = saas-rh-mvp-production.up.railway.app

# Verificar con dig (más detalle):
dig app.humanosisu.net CNAME
```

### **PASO 3: Test completo de conectividad**

```bash
# 1. Test básico de conexión
curl -I https://app.humanosisu.net

# 2. Test específico del login
curl -I https://app.humanosisu.net/login

# 3. Test de redirecciones
curl -I https://app.humanosisu.net/ 
# Debería redirigir a /app/dashboard o /app/login
```

## 🚀 COMANDOS RAILWAY ÚTILES

```bash
# Ver status completo
railway status

# Ver todos los dominios configurados
railway domains

# Ver logs en tiempo real
railway logs

# Forzar nuevo deployment
railway deploy

# Ver variables de entorno
railway variables
```

## 🔒 CONFIGURACIÓN SSL/TLS

### **Railway:**
- SSL se configura automáticamente
- Esperar 5-10 minutos después de agregar el dominio

### **Vercel:**
- SSL automático con Let's Encrypt
- Configuración instantánea

### **Cloudflare (si usas proxy):**
```
SSL/TLS → Overview → Full (strict)
Edge Certificates → Always Use HTTPS: ON
```

## 🧪 TESTING COMPLETO

### **1. Pruebas de Rutas:**

```bash
# Landing principal
curl https://www.humanosisu.net/

# Login de la app
curl https://app.humanosisu.net/

# Debería redirigir a dashboard cuando esté logueado
curl https://app.humanosisu.net/dashboard

# Login específico
curl https://app.humanosisu.net/login
```

### **2. Pruebas de Redirecciones:**

```bash
# Rutas legacy deberían redirigir
curl -I https://www.humanosisu.net/dashboard
# Debería redirigir a /app/dashboard

curl -I https://www.humanosisu.net/employees  
# Debería redirigir a /app/employees
```

### **3. Pruebas de Middleware:**

```bash
# Rutas protegidas sin login deberían redirigir a login
curl -I https://app.humanosisu.net/dashboard
# Sin cookies de sesión → Debería redirigir a /app/login
```

## 🚨 TROUBLESHOOTING

### **DNS no se resuelve:**

```bash
# 1. Verificar configuración DNS
nslookup app.humanosisu.net

# 2. Limpiar cache DNS local
# macOS:
sudo dscacheutil -flushcache

# Windows:
ipconfig /flushdns

# 3. Verificar TTL y esperar propagación (hasta 48h)
```

### **Errores SSL:**

```bash
# 1. Verificar que el dominio está agregado en Railway/Vercel
# 2. Esperar configuración automática de SSL
# 3. Verificar que no hay conflictos de proxy (Cloudflare)
```

### **Rutas no funcionan:**

```bash
# 1. Verificar que el deployment está actualizado
# 2. Verificar logs en Railway/Vercel
# 3. Verificar middleware en producción
```

## ✅ CHECKLIST DE VERIFICACIÓN

### **DNS Configurado:**
- [ ] Registro CNAME `app` apunta a tu deployment
- [ ] DNS se resuelve correctamente con `nslookup`
- [ ] Propagación completada (verificar en whatsmydns.net)

### **Deployment Actualizado:**
- [ ] Dominio `app.humanosisu.net` agregado en Railway/Vercel
- [ ] SSL configurado automáticamente
- [ ] Build exitoso con nueva estructura

### **Rutas Funcionando:**
- [ ] `https://www.humanosisu.net/` → Landing marketing
- [ ] `https://app.humanosisu.net/` → Redirige a dashboard o login
- [ ] `https://app.humanosisu.net/login` → Login de la aplicación
- [ ] `https://app.humanosisu.net/dashboard` → Panel principal (con auth)

### **Redirecciones Legacy:**
- [ ] `/dashboard` → `/app/dashboard`
- [ ] `/employees` → `/app/employees`
- [ ] `/payroll` → `/app/payroll`
- [ ] `/reports` → `/app/reports`

## 🎯 PRÓXIMOS PASOS DESPUÉS DE DNS

### **Inmediatamente después de configurar DNS:**

1. **Verificar Analytics:**
   - Configurar Google Analytics separado para app.humanosisu.net
   - Separar métricas de marketing vs aplicación

2. **Configurar Monitoring:**
   - Uptime monitoring para ambos dominios
   - Error tracking (Sentry) con diferentes proyectos

3. **Testing de Usuario:**
   - Probar flujo completo: Landing → Demo → Activación → Login → App
   - Verificar que todas las rutas internas funcionan

4. **SEO Optimization:**
   - Agregar sitemap.xml con URLs correctas
   - Verificar robots.txt
   - Google Search Console para ambos dominios

## 💡 COMANDOS ÚTILES

```bash
# Ver status del deployment
railway status

# Ver logs en tiempo real
railway logs

# Verificar dominios configurados
railway domains

# Test completo de la aplicación
npm run build && npm start
```

## ⚠️ NOTAS IMPORTANTES

1. **Propagación DNS:** Puede tardar hasta 24-48 horas
2. **SSL:** Se configura automáticamente pero puede tardar 5-10 minutos
3. **Cache:** Limpiar cache del navegador para probar cambios
4. **Monitoring:** Configurar alertas para ambos dominios
5. **Backup:** Mantener backup de configuración DNS actual
