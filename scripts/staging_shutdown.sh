#!/bin/bash

# Graceful shutdown script for staging environment
echo "Starting graceful shutdown of staging environment..."

# 1. Stop accepting new connections
docker exec saas-staging-postgres-1 psql -U admin -d saas_db_staging -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'saas_db_staging' AND pid <> pg_backend_pid();"

# 2. Wait for active queries to finish (max 30 seconds)
echo "Waiting for active queries to finish..."
sleep 30

# 3. Stop the containers
docker compose -f docker-compose.staging.yml down

echo "Staging environment shutdown complete"
