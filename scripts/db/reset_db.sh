#!/bin/bash

echo "🛑 Stopping all containers..."
docker-compose down

echo "🧹 Removing postgres volume..."
docker volume rm saas-proyecto_postgres-data || true

echo "🏗️ Building and starting ONLY the postgres container..."
docker-compose up -d postgres

echo "⏱️ Waiting for postgres to initialize (15 seconds)..."
sleep 15

echo "🔍 Checking postgres logs..."
docker logs saas-proyecto-postgres-1

echo "🌱 Inserting sample data..."
docker exec -i saas-proyecto-postgres-1 psql -U admin -d saas_db << EOF
-- Insert sample employees
INSERT INTO employees (id, name, dni, role, department, base_salary, checkin_time, checkout_time, hire_date, bank, account)
VALUES 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Juan Pérez', '0801-1990-12345', 'Developer', 'IT', 25000, '08:00', '17:00', '2022-01-15', 'Banco Atlántida', '1234567890'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'María López', '0801-1985-67890', 'Manager', 'HR', 35000, '08:30', '17:30', '2021-05-10', 'BAC', '0987654321'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Carlos Rodríguez', '0801-1995-24680', 'Designer', 'Marketing', 22000, '09:00', '18:00', '2023-03-22', 'Ficohsa', '5678901234');
EOF

echo "🏗️ Starting the rest of the services..."
docker-compose up -d

echo "⏱️ Waiting for all services to start (10 seconds)..."
sleep 10

echo "🩺 Testing database service..."
curl -s http://localhost:3000/health | jq . || echo "Failed to reach database service"

echo "🩺 Testing employee endpoint..."
curl -s http://localhost:3000/employees | jq 'length' || echo "Failed to get employees"

echo "🩺 Testing attendance endpoint..."
curl -s http://localhost:3000/attendance | jq 'length' || echo "Failed to get attendance"

echo "🩺 Testing nomina service..."
curl -s http://localhost:3002/health || echo "Failed to reach nomina service"

echo "✅ Reset and testing complete"
