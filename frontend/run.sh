#!/bin/bash
# Helper script for Humano SISU frontend development and deployment

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
S3_BUCKET="www.humanosisu.com"
CLOUDFRONT_DIST_ID="E3JC3C46Y6RAHD"

# Print header
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}       Humano SISU Frontend Helper       ${NC}"
echo -e "${GREEN}=========================================${NC}"

# Function to show help
show_help() {
  echo -e "Usage: ${YELLOW}./run.sh [command]${NC}\n"
  echo "Commands:"
  echo "  dev         - Start development server"
  echo "  build       - Build for production"
  echo "  deploy      - Deploy to S3 and invalidate CloudFront"
  echo "  backup      - Create a backup of the current production site"
  echo "  setup       - Initial setup (install dependencies and create .env.local)"
  echo "  test        - Run tests"
  echo "  help        - Show this help message"
  echo
}

# Function to set up the project
setup() {
  echo -e "${GREEN}Setting up the project...${NC}"
  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm install
  
  if [ ! -f .env.local ]; then
    echo -e "${YELLOW}Creating .env.local from template...${NC}"
    cp .env.template .env.local
    echo -e "${GREEN}Created .env.local - please edit this file with your API keys${NC}"
  else
    echo -e "${YELLOW}.env.local already exists, skipping...${NC}"
  fi
  
  echo -e "${GREEN}Setup complete!${NC}"
}

# Function to start dev server
start_dev() {
  echo -e "${GREEN}Starting development server...${NC}"
  npm run dev
}

# Function to build for production
build() {
  echo -e "${GREEN}Building for production...${NC}"
  npm run build
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Build successful!${NC}"
    echo -e "The build artifacts are in the ${YELLOW}dist/${NC} directory."
  else
    echo -e "${RED}Build failed!${NC}"
    exit 1
  fi
}

# Function to create a backup
backup() {
  echo -e "${GREEN}Creating backup of current production site...${NC}"
  BACKUP_DATE=$(date +%Y-%m-%d-%H%M)
  
  echo -e "${YELLOW}Backing up to s3://${S3_BUCKET}-backups/${BACKUP_DATE}/...${NC}"
  aws s3 sync s3://${S3_BUCKET} s3://${S3_BUCKET}-backups/${BACKUP_DATE}/
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Backup complete!${NC}"
  else
    echo -e "${RED}Backup failed!${NC}"
    exit 1
  fi
}

# Function to deploy
deploy() {
  read -p "Are you sure you want to deploy to production? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Build first
    build
    
    # Backup current production
    backup
    
    echo -e "${GREEN}Deploying to S3...${NC}"
    aws s3 sync dist/ s3://${S3_BUCKET} --delete
    
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}S3 deployment successful!${NC}"
      
      echo -e "${GREEN}Invalidating CloudFront cache...${NC}"
      INVALIDATION_ID=$(aws cloudfront create-invalidation --distribution-id ${CLOUDFRONT_DIST_ID} --paths "/*" --query 'Invalidation.Id' --output text)
      
      if [ $? -eq 0 ]; then
        echo -e "${GREEN}CloudFront invalidation initiated with ID: ${YELLOW}${INVALIDATION_ID}${NC}"
        echo -e "${GREEN}Deployment complete!${NC}"
        echo -e "Your changes should be live in a few minutes at ${YELLOW}https://${S3_BUCKET}${NC}"
      else
        echo -e "${RED}CloudFront invalidation failed!${NC}"
        exit 1
      fi
    else
      echo -e "${RED}S3 deployment failed!${NC}"
      exit 1
    fi
  else
    echo -e "${YELLOW}Deployment cancelled.${NC}"
  fi
}

# Function to run tests
run_tests() {
  echo -e "${GREEN}Running tests...${NC}"
  npm test
}

# Main command handler
case "$1" in
  dev)
    start_dev
    ;;
  build)
    build
    ;;
  deploy)
    deploy
    ;;
  backup)
    backup
    ;;
  setup)
    setup
    ;;
  test)
    run_tests
    ;;
  help|--help|-h)
    show_help
    ;;
  *)
    show_help
    ;;
esac
