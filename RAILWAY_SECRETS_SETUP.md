# 🚂 Railway Secrets & Environment Variables Setup

## 📋 Secrets Requeridos en GitHub

### **1. Supabase Configuration**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### **2. JWT & Security**
```bash
JWT_SECRET=your-super-secure-jwt-secret-here
```

### **3. Database**
```bash
DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/[database]
```

### **4. Redis (Opcional)**
```bash
REDIS_PASSWORD=your-redis-password
REDIS_HOST=your-redis-host
REDIS_PORT=6379
```

## 🔧 Configuración en GitHub

### **Agregar Secrets:**
1. Ve a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Agrega cada secret con su valor correspondiente

### **Verificar Secrets:**
```bash
# En tu workflow, los secrets se acceden así:
${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

## 🚂 Configuración en Railway

### **Variables de Entorno:**
Railway automáticamente sincroniza las variables de GitHub Actions.
También puedes configurarlas manualmente en Railway Dashboard:

1. Ve a tu proyecto en Railway
2. Variables → Add Variable
3. Agrega cada variable con su valor

### **Variables Críticas para Railway:**
```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
JWT_SECRET
DATABASE_URL
TZ=America/Tegucigalpa
NODE_ENV=production
PORT=8080
HOSTNAME=0.0.0.0
```

## ✅ Verificación

### **1. Verificar en GitHub Actions:**
- Los workflows deben ejecutarse sin errores de secrets
- Las variables deben estar disponibles en los logs

### **2. Verificar en Railway:**
- El deployment debe completarse exitosamente
- La aplicación debe responder en la URL de Railway
- Los logs no deben mostrar errores de variables de entorno

### **3. Verificar en la Aplicación:**
- Login debe funcionar
- Conexión a Supabase debe estar activa
- Base de datos debe ser accesible

## 🚨 Troubleshooting

### **Error: "Secret not found"**
- Verifica que el secret esté configurado en GitHub
- Asegúrate de que el nombre coincida exactamente

### **Error: "Environment variable not set"**
- Verifica que la variable esté en Railway
- Asegúrate de que esté sincronizada desde GitHub

### **Error: "Build failed"**
- Verifica que todas las variables críticas estén configuradas
- Revisa los logs de build en Railway

## 📚 Recursos Adicionales

- [Railway Documentation](https://docs.railway.app/)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
