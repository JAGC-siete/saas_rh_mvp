# 🧹 GUÍA DE CLEAN REDEPLOY COMPLETO

## 📋 RESUMEN EJECUTIVO
**Objetivo**: Eliminar completamente todo el caché y hacer un redeploy limpio
**Complejidad**: Media (requiere atención a detalles)
**Tiempo estimado**: 10-15 minutos
**Riesgo**: Bajo (con backups)

---

## 🎯 PROBLEMAS DE CACHÉ IDENTIFICADOS

### **🔍 Posibles Fuentes de Caché**
1. **Next.js Build Cache** (`.next/`)
2. **Node Modules Cache** (`node_modules/`)
3. **Railway Build Cache** (caché de deployment)
4. **Browser Cache** (caché del navegador)
5. **Docker Cache** (si usas contenedores)
6. **Environment Variables Cache** (Railway)

---

## 🧹 SECUENCIA DE CLEAN REDEPLOY

### **FASE 1: LIMPIEZA LOCAL COMPLETA**

#### **1.1 Detener Servidores**
```bash
# Detener servidor de desarrollo
pkill -f "npm run dev"
pkill -f "next dev"

# Detener otros procesos de Node
pkill -f "node"

# Verificar que no hay procesos corriendo
ps aux | grep -E "(node|npm|next)" | grep -v grep
```

#### **1.2 Limpieza de Caché Local**
```bash
# Limpiar caché de Next.js
rm -rf .next/

# Limpiar node_modules
rm -rf node_modules/

# Limpiar package-lock.json (forzar reinstalación limpia)
rm -f package-lock.json

# Limpiar caché de npm
npm cache clean --force

# Limpiar caché de yarn (si usas yarn)
yarn cache clean
```

#### **1.3 Limpieza de Archivos Temporales**
```bash
# Limpiar archivos temporales del sistema
rm -rf /tmp/.next-*
rm -rf /tmp/npm-*

# Limpiar logs locales
rm -f *.log
rm -rf logs/

# Limpiar archivos de backup temporales
find . -name "*.backup*" -type f -delete
find . -name "*.tmp" -type f -delete
```

### **FASE 2: REINSTALACIÓN LIMPIA**

#### **2.1 Reinstalar Dependencias**
```bash
# Instalar dependencias desde cero
npm install

# Verificar instalación
npm list --depth=0
```

#### **2.2 Verificar Variables de Entorno**
```bash
# Verificar archivo .env.local
cat .env.local

# Verificar que las variables críticas están presentes
grep -E "(NEXT_PUBLIC_SUPABASE|SUPABASE_SERVICE_ROLE|DATABASE_URL)" .env.local
```

#### **2.3 Build Limpio**
```bash
# Build de desarrollo
npm run build

# Verificar que el build es exitoso
echo "Build completed successfully"
```

### **FASE 3: LIMPIEZA DE RAILWAY**

#### **3.1 Limpiar Caché de Railway**
```bash
# Verificar configuración actual de Railway
railway status

# Limpiar caché de Railway (si es posible)
railway logout
railway login

# Forzar rebuild en Railway
railway up --force
```

#### **3.2 Verificar Variables en Railway**
```bash
# Listar variables de entorno en Railway
railway variables

# Verificar variables críticas
railway variables | grep -E "(NEXT_PUBLIC_SUPABASE|SUPABASE_SERVICE_ROLE|DATABASE_URL)"
```

### **FASE 4: LIMPIEZA DE NAVEGADOR**

#### **4.1 Limpiar Caché del Navegador**
```bash
# Abrir navegador y limpiar caché manualmente
# O usar comandos específicos del navegador

# Chrome/Edge
# Ctrl+Shift+Delete -> Limpiar todo

# Firefox
# Ctrl+Shift+Delete -> Limpiar todo

# Safari
# Cmd+Option+E -> Limpiar caché
```

#### **4.2 Limpiar LocalStorage y SessionStorage**
```javascript
// Ejecutar en consola del navegador
localStorage.clear();
sessionStorage.clear();
```

---

## 🚀 SCRIPT AUTOMATIZADO

### **Script de Clean Redeploy Completo**
```bash
#!/bin/bash
# clean-redeploy.sh

echo "🧹 INICIANDO CLEAN REDEPLOY COMPLETO"
echo "=================================="

# FASE 1: Detener procesos
echo "1️⃣ Deteniendo procesos..."
pkill -f "npm run dev" 2>/dev/null
pkill -f "next dev" 2>/dev/null
pkill -f "node" 2>/dev/null
sleep 2

# FASE 2: Limpiar caché
echo "2️⃣ Limpiando caché..."
rm -rf .next/
rm -rf node_modules/
rm -f package-lock.json
npm cache clean --force
sleep 2

# FASE 3: Reinstalar
echo "3️⃣ Reinstalando dependencias..."
npm install
sleep 2

# FASE 4: Build
echo "4️⃣ Haciendo build limpio..."
npm run build
sleep 2

# FASE 5: Verificar
echo "5️⃣ Verificando instalación..."
npm list --depth=0 | head -10

echo "✅ CLEAN REDEPLOY COMPLETADO"
echo "🚀 Ejecuta 'npm run dev' para iniciar el servidor"
```

---

## 🔧 COMANDOS ESPECÍFICOS POR PLATAFORMA

### **Railway Específico**
```bash
# Forzar rebuild completo en Railway
railway up --force

# Limpiar y redeploy
railway logout
railway login
railway up

# Verificar deployment
railway status
railway logs
```

### **Vercel Específico**
```bash
# Limpiar caché de Vercel
vercel --clear-cache

# Redeploy forzado
vercel --force

# Verificar deployment
vercel ls
```

### **Docker Específico**
```bash
# Limpiar contenedores y caché
docker system prune -a --volumes

# Rebuild sin caché
docker build --no-cache .

# Redeploy
docker-compose down
docker-compose up --build
```

---

## ⚠️ CONSIDERACIONES IMPORTANTES

### **🔴 Riesgos y Precauciones**
1. **Backup antes de limpiar**: Asegúrate de tener commits recientes
2. **Variables de entorno**: Verifica que estén configuradas correctamente
3. **Datos de producción**: No afecta la base de datos
4. **Tiempo de inactividad**: 5-10 minutos durante el proceso

### **🟡 Verificaciones Post-Limpieza**
1. **Build exitoso**: `npm run build`
2. **Servidor funcional**: `npm run dev`
3. **Variables cargadas**: Verificar en consola
4. **APIs respondiendo**: Probar endpoints
5. **UI funcionando**: Verificar páginas principales

---

## 🎯 SECUENCIA RÁPIDA (5 MINUTOS)

### **Para Problemas Urgentes**
```bash
# Secuencia rápida
pkill -f "npm run dev"
rm -rf .next/
rm -rf node_modules/
npm install
npm run build
npm run dev
```

---

## 📊 COMPLEJIDAD DE LA TAREA

### **📈 Nivel de Complejidad: MEDIO**

#### **✅ Fácil (1-2 minutos)**
- Limpiar `.next/`
- Reiniciar servidor

#### **⚠️ Medio (5-10 minutos)**
- Clean redeploy completo
- Reinstalación de dependencias

#### **🔴 Complejo (15+ minutos)**
- Limpieza de Railway
- Configuración de variables
- Debugging de problemas

---

## 🎯 RECOMENDACIÓN

### **Para tu caso específico:**
1. **Ejecuta la secuencia rápida** primero
2. **Si persiste el problema**, ejecuta el clean redeploy completo
3. **Si aún hay problemas**, verifica variables de Railway

### **Comando recomendado:**
```bash
# Ejecutar esto primero
pkill -f "npm run dev" && rm -rf .next/ && npm run dev
```

---

## 🏆 CONCLUSIÓN

**El clean redeploy es una herramienta poderosa** para resolver problemas de caché. La complejidad es media pero muy manejable con la secuencia correcta de comandos.

**¿Quieres que ejecute la secuencia rápida ahora?** 