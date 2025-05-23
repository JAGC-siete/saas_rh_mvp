#!/bin/bash

echo "🔍 Verificando correcciones implementadas..."
echo ""

echo "1️⃣ Verificando esquema de base de datos..."
docker exec -it saas-proyecto-postgres-1 psql -U admin -d saas_db -c "\dt" || echo "❌ Error al conectar a Postgres"

echo ""
echo "2️⃣ Verificando estructura de tablas y fields:"
docker exec -it saas-proyecto-postgres-1 psql -U admin -d saas_db -c "\d employees" || echo "❌ No se pudo obtener estructura de employees"
docker exec -it saas-proyecto-postgres-1 psql -U admin -d saas_db -c "\d asistencia" || echo "❌ No se pudo obtener estructura de asistencia"
docker exec -it saas-proyecto-postgres-1 psql -U admin -d saas_db -c "\d payroll" || echo "❌ No se pudo obtener estructura de payroll"

echo ""
echo "3️⃣ Verificando endpoint /attendance con employee_id:"
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"employee_id": "12345", "justificacion": "Prueba de endpoint"}' \
  http://localhost:3003/attendance | jq . || echo "❌ Error en endpoint attendance"

echo ""
echo "4️⃣ Verificando conexión entre servicios:"
curl -s http://localhost:3002/diagnose | jq . || echo "❌ Error en servicio de nómina"

echo ""
echo "5️⃣ Verificando nombres consistentes en API:"
echo "Nómina → employees:"
curl -s http://localhost:3000/employees | jq '.[0] | keys' || echo "❌ Error en API employees"
echo "Nómina → asistencia:"
curl -s http://localhost:3000/attendance | jq '.[0] | keys' || echo "❌ Error en API asistencia"

echo ""
echo "✅ Verificación completada"