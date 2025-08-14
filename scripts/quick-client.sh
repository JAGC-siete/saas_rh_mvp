#!/bin/bash

# 🚀 HERRAMIENTA RÁPIDA PARA CREAR NUEVOS CLIENTES
# Uso: ./quick-client.sh [nombre-empresa] [num-empleados] [num-departamentos]

echo "🏗️  GENERADOR RÁPIDO DE CLIENTES HR SAAS"
echo "=========================================="

# Parámetros por defecto
EMPRESA=${1:-"Empresa Demo $(date +%m%d)"}
EMPLEADOS=${2:-12}
DEPARTAMENTOS=${3:-3}

# Generar datos únicos
TIMESTAMP=$(date +%m%d%H%M)
ADMIN_NAME="Admin Usuario"
ADMIN_EMAIL="admin${TIMESTAMP}@$(echo $EMPRESA | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]//g').hn"
ADMIN_PASSWORD="Pass${TIMESTAMP}!"

echo "📋 Creando cliente con:"
echo "   🏢 Empresa: $EMPRESA"
echo "   👥 Empleados: $EMPLEADOS" 
echo "   🏛️ Departamentos: $DEPARTAMENTOS"
echo "   👑 Admin: $ADMIN_NAME"
echo "   📧 Email: $ADMIN_EMAIL"
echo "   🔑 Password: $ADMIN_PASSWORD"
echo ""

# Ejecutar el script principal
node scripts/create-new-client.mjs \
  --empresa "$EMPRESA" \
  --admin "$ADMIN_NAME" \
  --email "$ADMIN_EMAIL" \
  --password "$ADMIN_PASSWORD" \
  --empleados $EMPLEADOS \
  --departamentos $DEPARTAMENTOS \
  --force

echo ""
echo "🎉 ¡Cliente creado! Datos de acceso:"
echo "   URL: https://tu-app.railway.app/app/login"
echo "   Usuario: $ADMIN_EMAIL"
echo "   Password: $ADMIN_PASSWORD"
