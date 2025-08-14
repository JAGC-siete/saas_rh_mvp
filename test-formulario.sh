#!/bin/bash

echo "🧪 Probando el formulario dinámico de activación..."
echo "=============================================="

# Función para probar el API
test_api() {
  local test_name="$1"
  local data="$2"
  
  echo -n "Probando $test_name... "
  
  response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3001/api/activar \
    -H "Content-Type: application/json" \
    -d "$data")
  
  http_code=$(echo "$response" | tail -n1)
  response_body=$(echo "$response" | head -n -1)
  
  if [ "$http_code" = "200" ]; then
    echo "✅ ÉXITO"
    echo "   Respuesta: $(echo "$response_body" | jq -r '.message // .')"
  else
    echo "❌ FALLÓ (HTTP $http_code)"
    echo "   Error: $(echo "$response_body" | jq -r '.error // .')"
  fi
  echo ""
}

# Test 1: Caso válido
test_api "caso válido" '{
  "empleados": 5,
  "departamentosCount": 3,
  "empresa": "Empresa de Prueba S.A.",
  "contactoNombre": "Juan Pérez",
  "contactoWhatsApp": "+504 9999-9999",
  "contactoEmail": "juan.perez@empresa.com",
  "monto": 1500
}'

# Test 2: Sin email (debe fallar)
test_api "sin email" '{
  "empleados": 3,
  "departamentosCount": 2,
  "empresa": "Test Company",
  "contactoNombre": "Test User",
  "contactoWhatsApp": "9999-9999",
  "monto": 900
}'

# Test 3: Empleados inválidos (debe fallar)
test_api "empleados inválidos" '{
  "empleados": 0,
  "departamentosCount": 1,
  "empresa": "Test Company",
  "contactoNombre": "Test User",
  "contactoWhatsApp": "9999-9999",
  "contactoEmail": "test@test.com",
  "monto": 0
}'

# Test 4: Monto incorrecto (debe fallar)
test_api "monto incorrecto" '{
  "empleados": 2,
  "departamentosCount": 1,
  "empresa": "Test Company",
  "contactoNombre": "Test User",
  "contactoWhatsApp": "9999-9999",
  "contactoEmail": "test@test.com",
  "monto": 1000
}'

echo "🏁 Pruebas completadas!"
