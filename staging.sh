#!/bin/bash

# Set environment variables
export COMPOSE_PROJECT_NAME=saas-staging
export COMPOSE_FILE=docker-compose.staging.yml

function copy_env_files() {
    echo "Copying environment files..."
    cp bases_de_datos/.env bases_de_datos/.env.staging 2>/dev/null || true
    cp asistencia/.env asistencia/.env.staging 2>/dev/null || true
    cp nomina/.env nomina/.env.staging 2>/dev/null || true
    
    # Update the database name in staging env files
    sed -i '' 's/saas_db/saas_db_staging/g' */\.env.staging 2>/dev/null || true
    sed -i '' 's/DB_PASSWORD=.*/DB_PASSWORD=secret_staging/g' */\.env.staging 2>/dev/null || true
}

function start_staging() {
    echo "Starting staging environment..."
    copy_env_files
    docker compose -f docker-compose.staging.yml up -d
}

function stop_staging() {
    echo "Stopping staging environment..."
    docker compose -f docker-compose.staging.yml down
}

function restart_staging() {
    stop_staging
    start_staging
}

function logs() {
    docker compose -f docker-compose.staging.yml logs -f
}

function status() {
    docker compose -f docker-compose.staging.yml ps
}

function initialize_db() {
    echo "Initializing staging database..."
    # Wait for postgres to be ready
    sleep 10
    
    # Run initialization scripts
    for sql_file in postgres-init/*.sql; do
        echo "Running $sql_file..."
        docker compose -f docker-compose.staging.yml exec -T postgres psql -U admin -d saas_db_staging < "$sql_file"
    done
}

# Command line argument handling
case "$1" in
    start)
        start_staging
        initialize_db
        ;;
    stop)
        stop_staging
        ;;
    restart)
        restart_staging
        ;;
    logs)
        logs
        ;;
    status)
        status
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs|status}"
        exit 1
        ;;
esac
