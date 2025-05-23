#!/usr/bin/env zsh

set -e

ENVIRONMENT="staging"
PROJECT="saas-rh"

echo "Creating/updating secrets for ${ENVIRONMENT} environment..."

# Read database password from local file
DB_PASSWORD=$(cat /Users/jorgearturo/saas-proyecto/secrets/db_password_${ENVIRONMENT}.txt)

# Create/update database credentials
aws secretsmanager create-secret \
  --name "/${PROJECT}/${ENVIRONMENT}/database" \
  --description "Database credentials for ${ENVIRONMENT}" \
  --secret-string "{\"username\":\"admin\",\"password\":\"${DB_PASSWORD}\"}" \
  --region us-east-1 \
  || aws secretsmanager update-secret \
    --secret-id "/${PROJECT}/${ENVIRONMENT}/database" \
    --secret-string "{\"username\":\"admin\",\"password\":\"${DB_PASSWORD}\"}" \
    --region us-east-1

# Create/update JWT secret
JWT_SECRET=$(openssl rand -base64 32)
aws secretsmanager create-secret \
  --name "/${PROJECT}/${ENVIRONMENT}/jwt" \
  --description "JWT secret for ${ENVIRONMENT}" \
  --secret-string "{\"secret\":\"${JWT_SECRET}\"}" \
  --region us-east-1 \
  || aws secretsmanager update-secret \
    --secret-id "/${PROJECT}/${ENVIRONMENT}/jwt" \
    --secret-string "{\"secret\":\"${JWT_SECRET}\"}" \
    --region us-east-1

# Create/update Redis credentials
REDIS_PASSWORD=$(openssl rand -base64 32)
aws secretsmanager create-secret \
  --name "/${PROJECT}/${ENVIRONMENT}/redis" \
  --description "Redis credentials for ${ENVIRONMENT}" \
  --secret-string "{\"password\":\"${REDIS_PASSWORD}\"}" \
  --region us-east-1 \
  || aws secretsmanager update-secret \
    --secret-id "/${PROJECT}/${ENVIRONMENT}/redis" \
    --secret-string "{\"password\":\"${REDIS_PASSWORD}\"}" \
    --region us-east-1

echo "Secrets created/updated successfully!"
