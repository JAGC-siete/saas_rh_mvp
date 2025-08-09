#!/bin/bash

# Script para probar el endpoint /api/activar con cURL
# Simula el envío del formulario de activación

echo "🚀 PROBANDO ENDPOINT /api/activar CON cURL"
echo "=" | head -c 50; echo

# Configuración
API_URL="http://localhost:3001/api/activar"
TEMP_FILE="/tmp/test_comprobante.txt"

# Crear archivo temporal para simular comprobante
echo "Este es un comprobante de pago de prueba - $(date)" > $TEMP_FILE

echo "📝 Datos del formulario:"
echo "  • Empresa: Mi Empresa Test cURL"
echo "  • Empleados: 25"
echo "  • Contacto: Jorge Arturo"
echo "  • WhatsApp: +504 9876-5432"
echo "  • Email: jorge@test.com"
echo "  • Departamentos: [\"Administración\", \"Ventas\", \"IT\"]"
echo "  • Comprobante: $TEMP_FILE"
echo

echo "🌐 Enviando solicitud POST a: $API_URL"
echo

# Ejecutar cURL con FormData
curl -X POST $API_URL \
  -F "empresa=Mi Empresa Test cURL" \
  -F "empleados=25" \
  -F "contactoNombre=Jorge Arturo" \
  -F "contactoWhatsApp=+504 9876-5432" \
  -F "contactoEmail=jorge@test.com" \
  -F "departamentos=[\"Administración\", \"Ventas\", \"IT\"]" \
  -F "comprobante=@$TEMP_FILE" \
  -H "Accept: application/json" \
  -w "\n\n📊 Detalles de la respuesta:\n⏱️  Tiempo total: %{time_total}s\n📡 Código HTTP: %{http_code}\n📏 Tamaño respuesta: %{size_download} bytes\n" \
  -v

echo
echo "🧹 Limpiando archivo temporal..."
rm -f $TEMP_FILE

echo
echo "✅ Prueba de cURL completada"
echo "💡 Si recibiste un JSON con éxito, el endpoint funciona correctamente"
