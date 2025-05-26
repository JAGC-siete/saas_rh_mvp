#!/bin/bash
set -e

# Configure AWS and kubectl
aws eks update-kubeconfig --region us-east-1 --name saas-rh-staging

# Log into ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 826726045450.dkr.ecr.us-east-1.amazonaws.com

# Build and push images if they don't exist
for service in bases_de_datos asistencia nomina; do
    service_name=$(echo $service | tr '_' '-')
    aws ecr describe-repositories --repository-names $service_name --region us-east-1 || \
        aws ecr create-repository --repository-name $service_name --region us-east-1
    
    echo "Building and pushing $service_name..."
    docker build -t 826726045450.dkr.ecr.us-east-1.amazonaws.com/$service_name:latest $service/
    docker push 826726045450.dkr.ecr.us-east-1.amazonaws.com/$service_name:latest
done

# Apply Kubernetes manifests
kubectl apply -f k8s/base/services/

# Wait for deployments to be ready
echo "Waiting for deployments to be ready..."
kubectl rollout status deployment/bases-de-datos --timeout=300s
kubectl rollout status deployment/asistencia --timeout=300s
kubectl rollout status deployment/nomina --timeout=300s

# Print pod status
echo "Pod status:"
kubectl get pods

echo "Service endpoints:"
kubectl get ingress

echo "All services deployed successfully!"
