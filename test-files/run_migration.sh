#!/bin/bash
# Script para ejecutar migración en Supabase

# Variables de conexión
HOST="aws-0-us-east-1.pooler.supabase.com"
PORT="6543"
USER="postgres.nbrqhbppvqobyfkvnjoh"
PASSWORD="8Q!hzX9vAf@xQfj"
DATABASE="postgres"

# Exportar la contraseña
export PGPASSWORD="$PASSWORD"

# Ejecutar el script de migración
psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DATABASE" -f migration_employee_data_ui.sql

# Limpiar la variable de entorno
unset PGPASSWORD

echo "Migración completada"
