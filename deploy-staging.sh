#!/bin/bash

echo "🚀 Starting staging deployment..."

# 1. Set up environment variables
export COMPOSE_PROJECT_NAME=saas-staging

# 2. Create staging environment files
echo "📝 Creating staging environment files..."

cat > bases_de_datos/.env.staging << EOL
NODE_ENV=staging
DB_HOST=postgres
DB_USER=admin
DB_PASSWORD=secret_staging
DB_NAME=saas_db_staging
PORT=3000
CORS_ORIGIN=http://localhost:3010,http://localhost:3012,http://localhost:3013
EOL

cat > asistencia/.env.staging << EOL
NODE_ENV=staging
DB_HOST=postgres
DB_USER=admin
DB_PASSWORD=secret_staging
DB_NAME=saas_db_staging
PORT=3003
CORS_ORIGIN=http://localhost:3010,http://localhost:3012,http://localhost:3013
EOL

cat > nomina/.env.staging << EOL
NODE_ENV=staging
DB_HOST=postgres
DB_USER=admin
DB_PASSWORD=secret_staging
DB_NAME=saas_db_staging
PORT=3002
JWT_SECRET=staging_jwt_secret_2025
CORS_ORIGIN=http://localhost:3010,http://localhost:3012,http://localhost:3013
EOL

# 3. Start staging services
echo "🌐 Starting staging services..."
docker compose -f docker-compose.staging.yml --env-file bases_de_datos/.env.staging up -d

# 4. Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# 5. Initialize the database
echo "🗄️ Initializing database..."
docker compose -f docker-compose.staging.yml exec postgres psql -U admin -d saas_db_staging -f /docker-entrypoint-initdb.d/init.sql

# 6. Check service health
echo "🏥 Checking service health..."
for port in 3010 3012 3013; do
  until curl -s http://localhost:$port/health > /dev/null; do
    echo "Waiting for service on port $port..."
    sleep 5
  done
  echo "Service on port $port is healthy!"
done

echo "✅ Staging environment is ready!"
echo "
Services available at:
- Database service: http://localhost:3010
- Payroll service: http://localhost:3012
- Attendance service: http://localhost:3013
"
