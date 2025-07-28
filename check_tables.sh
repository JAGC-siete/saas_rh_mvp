#!/bin/bash

echo "🔍 Consultando estado de la base de datos..."
echo "==========================================="

# Usar curl para hacer peticiones directas a la API de Supabase
BASE_URL="https://fwyxmovfrzauebiqxchz.supabase.co"
API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjI4MjgzOCwiZXhwIjoyMDUxODU4ODM4fQ.cNsUZ1f_GVPOQDlAVh68WJrnRJH0NsQ1_BeCGGq0H6A"

echo ""
echo "📋 Consultando tabla COMPANIES..."
curl -X GET "${BASE_URL}/rest/v1/companies?select=*&limit=5" \
  -H "apikey: ${API_KEY}" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" 2>/dev/null | python3 -m json.tool || echo "No se pudo consultar companies"

echo ""
echo "👥 Consultando tabla EMPLOYEES..."  
curl -X GET "${BASE_URL}/rest/v1/employees?select=id,name,dni,position,company_id&limit=5" \
  -H "apikey: ${API_KEY}" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" 2>/dev/null | python3 -m json.tool || echo "No se pudo consultar employees"

echo ""
echo "📊 Consultando tabla ATTENDANCE_RECORDS..."
curl -X GET "${BASE_URL}/rest/v1/attendance_records?select=date,check_in,check_out,status&limit=5" \
  -H "apikey: ${API_KEY}" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" 2>/dev/null | python3 -m json.tool || echo "No se pudo consultar attendance_records"

echo ""
echo "🏢 Consultando tabla DEPARTMENTS..."
curl -X GET "${BASE_URL}/rest/v1/departments?select=name,description&limit=5" \
  -H "apikey: ${API_KEY}" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" 2>/dev/null | python3 -m json.tool || echo "No se pudo consultar departments"

echo ""
echo "⏰ Consultando tabla WORK_SCHEDULES..."
curl -X GET "${BASE_URL}/rest/v1/work_schedules?select=name,monday_start,monday_end&limit=3" \
  -H "apikey: ${API_KEY}" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" 2>/dev/null | python3 -m json.tool || echo "No se pudo consultar work_schedules"
