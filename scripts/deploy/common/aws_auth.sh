#!/bin/zsh

source "$(dirname "$0")/vars.sh"

authenticate_aws() {
    echo "🔑 Authenticating with AWS ECR..."
    aws ecr get-login-password --region $AWS_REGION | \
    docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
}

setup_k8s() {
    echo "⚙️ Configuring kubectl for EKS cluster..."
    aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME
}

ensure_ecr_repositories() {
    local service=$1
    echo "🏗️ Creating/verifying repository for $service..."
    aws ecr describe-repositories --repository-names $service --region $AWS_REGION || \
    aws ecr create-repository --repository-name $service --region $AWS_REGION
}
