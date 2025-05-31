#!/bin/bash
# Script to rotate API tokens and update them securely
# This script helps manage tokens for different environments

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Usage information
function show_usage {
  echo -e "${BLUE}Token Rotation Utility${NC}"
  echo "Usage: ./rotate-token.sh [options]"
  echo ""
  echo "Options:"
  echo "  -e, --environment ENV   Environment to update (dev, staging, prod)"
  echo "  -t, --token-type TYPE   Type of token to rotate (manatal, auth0, etc.)"
  echo "  -h, --help              Display this help message"
  echo ""
  echo "Examples:"
  echo "  ./rotate-token.sh --environment staging --token-type manatal"
  echo "  ./rotate-token.sh -e prod -t auth0"
}

# Parse arguments
ENVIRONMENT=""
TOKEN_TYPE=""

while [[ $# -gt 0 ]]; do
  key="$1"

  case $key in
    -e|--environment)
      ENVIRONMENT="$2"
      shift
      shift
      ;;
    -t|--token-type)
      TOKEN_TYPE="$2"
      shift
      shift
      ;;
    -h|--help)
      show_usage
      exit 0
      ;;
    *)
      echo -e "${RED}Error: Unknown option $key${NC}"
      show_usage
      exit 1
      ;;
  esac
done

# Check required arguments
if [ -z "$ENVIRONMENT" ] || [ -z "$TOKEN_TYPE" ]; then
  echo -e "${RED}Error: Both environment and token type are required${NC}"
  show_usage
  exit 1
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
  echo -e "${RED}Error: Environment must be one of: dev, staging, prod${NC}"
  exit 1
fi

# Validate token type
if [[ ! "$TOKEN_TYPE" =~ ^(manatal|auth0|aws)$ ]]; then
  echo -e "${RED}Error: Token type must be one of: manatal, auth0, aws${NC}"
  exit 1
fi

echo -e "${BLUE}Starting token rotation for $TOKEN_TYPE in $ENVIRONMENT environment${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
  echo -e "${RED}Error: AWS CLI not found. Please install it to continue.${NC}"
  exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo -e "${RED}Error: jq not found. Please install it to continue.${NC}"
  exit 1
fi

# Generate secret name based on environment and token type
SECRET_NAME="${ENVIRONMENT}/${TOKEN_TYPE}-api-token"

# Check if secret exists
if ! aws secretsmanager describe-secret --secret-id "$SECRET_NAME" &> /dev/null; then
  echo -e "${YELLOW}Secret $SECRET_NAME doesn't exist. Creating it...${NC}"
  
  # Check if this is a fresh creation
  echo -e "${YELLOW}Is this a new token that needs to be created? (y/n)${NC}"
  read -r CREATE_NEW
  
  if [[ "$CREATE_NEW" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Please enter the new token value:${NC}"
    read -rs NEW_TOKEN
    
    # Create the new secret
    aws secretsmanager create-secret \
      --name "$SECRET_NAME" \
      --description "$TOKEN_TYPE API token for $ENVIRONMENT environment" \
      --secret-string "$NEW_TOKEN"
      
    echo -e "${GREEN}Secret $SECRET_NAME created successfully.${NC}"
  else
    echo -e "${RED}Operation cancelled. No changes were made.${NC}"
    exit 0
  fi
else
  # Secret exists, rotate it
  echo -e "${YELLOW}Rotating existing secret $SECRET_NAME...${NC}"
  
  # Get current value for backup
  CURRENT_VALUE=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_NAME" \
    --query SecretString --output text)
  
  echo -e "${BLUE}Current token retrieved. You'll need to generate a new token from the service provider.${NC}"
  echo -e "${YELLOW}Please enter the new token value:${NC}"
  read -rs NEW_TOKEN
  
  # Update the secret
  aws secretsmanager update-secret \
    --secret-id "$SECRET_NAME" \
    --secret-string "$NEW_TOKEN"
  
  echo -e "${GREEN}Secret $SECRET_NAME updated successfully.${NC}"
  
  # Create backup of old token (for emergency rollback)
  BACKUP_SECRET_NAME="${SECRET_NAME}-previous"
  
  aws secretsmanager create-secret \
    --name "$BACKUP_SECRET_NAME" \
    --description "Previous $TOKEN_TYPE API token for $ENVIRONMENT environment (backup)" \
    --secret-string "$CURRENT_VALUE" \
    --force-overwrite-replica-secret &> /dev/null || true
    
  echo -e "${GREEN}Previous token backed up to $BACKUP_SECRET_NAME${NC}"
fi

# Update relevant CI/CD variables if needed
if [ "$ENVIRONMENT" = "prod" ]; then
  echo -e "${BLUE}Do you want to update the GitHub Actions secret? (y/n)${NC}"
  read -r UPDATE_GITHUB
  
  if [[ "$UPDATE_GITHUB" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Please use the GitHub UI to update the secret manually.${NC}"
    echo -e "${BLUE}Secret name to update: ${TOKEN_TYPE^^}_API_TOKEN${NC}"
    echo -e "${BLUE}Instructions:${NC}"
    echo "1. Go to your GitHub repository"
    echo "2. Navigate to Settings > Secrets and variables > Actions"
    echo "3. Update the ${TOKEN_TYPE^^}_API_TOKEN with the new value"
  fi
fi

echo -e "${GREEN}Token rotation completed successfully!${NC}"
echo -e "${YELLOW}Important: Make sure to update any local .env files if needed.${NC}"

# Record the rotation in audit log
AUDIT_FILE="./token_rotation_log.txt"
echo "[$(date)] Rotated $TOKEN_TYPE token for $ENVIRONMENT environment" >> "$AUDIT_FILE"
echo -e "${BLUE}Rotation recorded in audit log.${NC}"

exit 0
