#!/bin/zsh

set -e

# Source common files
SCRIPT_DIR=${0:a:h}
source "$SCRIPT_DIR/common/vars.sh"
source "$SCRIPT_DIR/common/aws_auth.sh"

# Initialize AWS authentication
authenticate_aws

# Function to build and push a service
build_and_push_service() {
    local SERVICE=$1
    echo "🏗️  Building $SERVICE..."
    
    # Navigate to service directory from project root
    cd "/Users/jorgearturo/saas-proyecto/$SERVICE"
    
    # Build the image with platform specification for M1 Macs and tag it directly for ECR
    echo "Building for repository: ${REPO_NAMES[$SERVICE]}"
    docker build --platform linux/amd64 \
      -t "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAMES[$SERVICE]}:latest" \
      --label "repository=${REPO_NAMES[$SERVICE]}" \
      -f Dockerfile .
    
    # Push the image
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${REPO_NAMES[$SERVICE]}:latest
    
    # Go back to project root
    cd ..
}

# Create repositories if they don't exist
for SERVICE in "${SERVICES[@]}"; do
    echo "🏗️  Creating/verifying repository for $SERVICE..."
    aws ecr describe-repositories --repository-names $SERVICE --region $AWS_REGION || \
    aws ecr create-repository --repository-name $SERVICE --region $AWS_REGION
done

# Build and push each service
for SERVICE in "${SERVICES[@]}"; do
    build_and_push_service $SERVICE
done

echo "✅ All services have been built and pushed successfully!"