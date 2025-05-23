#!/bin/bash

echo "🔄 Stopping existing containers..."
docker-compose down

echo "🧹 Cleaning up volumes to force schema recreation..."
docker volume rm saas-proyecto_postgres-data || true

echo "🏗️ Building and starting containers..."
docker-compose up --build -d

echo "⏱️ Waiting for services to start (30 seconds)..."
sleep 30

echo "🩺 Testing database service..."
curl -s http://localhost:3000/health | jq .

echo "🩺 Testing employee endpoint..."
curl -s http://localhost:3000/employees | jq 'length'

echo "🩺 Testing attendance endpoint..."
curl -s http://localhost:3000/attendance | jq 'length'

echo "🩺 Testing nomina service..."
curl -s http://localhost:3002/health

echo "🧪 Running integration test..."
echo "Creating a test attendance record..."
curl -X POST -H "Content-Type: application/json" -d '{"last5":"12345","justification":"Test record"}' http://localhost:3003/attendance

echo "✅ Tests completed. Check the output for any errors."
echo "Services are available at:"
echo "- Database API: http://localhost:3000"
echo "- Attendance: http://localhost:3003/attendance"
echo "- Nomina: http://localhost:3002/planilla"
