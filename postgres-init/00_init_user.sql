-- Create admin user with proper password
CREATE USER admin WITH PASSWORD 'postgres_staging_password_123' CREATEDB;

-- Create and grant access to the database
CREATE DATABASE saas_db_staging;
GRANT ALL PRIVILEGES ON DATABASE saas_db_staging TO admin;
