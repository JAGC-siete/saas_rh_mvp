#!/bin/bash

echo "🚀 FORZANDO REBUILD COMPLETO"
echo "============================"

# 1. Limpiar todo
echo "1️⃣ Limpiando caché y archivos temporales..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .vercel/output

# 2. Reinstalar dependencias
echo "2️⃣ Reinstalando dependencias..."
npm ci

# 3. Verificar variables de entorno
echo "3️⃣ Verificando variables de entorno..."
if [ -f ".env.production" ]; then
    echo "✅ .env.production encontrado"
    grep "NEXT_PUBLIC_SUPABASE" .env.production
else
    echo "❌ .env.production no encontrado"
fi

# 4. Build de producción
echo "4️⃣ Haciendo build de producción..."
npm run build

# 5. Verificar build
echo "5️⃣ Verificando build..."
if [ -d ".next" ]; then
    echo "✅ Build exitoso"
else
    echo "❌ Build falló"
    exit 1
fi

# 6. Deploy
echo "6️⃣ Desplegando..."
vercel --prod

echo "✅ Rebuild y deploy completados!"
echo ""
echo "🔍 Para verificar:"
echo "1. Ve a https://humanosisu.net/test-env"
echo "2. Verifica que las variables aparezcan como '✅ Set'"
echo "3. Prueba el login en https://humanosisu.net/login-12factor" 