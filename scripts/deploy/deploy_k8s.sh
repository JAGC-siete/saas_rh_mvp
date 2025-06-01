#!/bin/zsh

set -e

# Source common files
SCRIPT_DIR=${0:a:h}
source "$SCRIPT_DIR/common/vars.sh"
source "$SCRIPT_DIR/common/aws_auth.sh"

# Initialize AWS and kubectl configuration
authenticate_aws
setup_k8s

# Create namespace if it doesn't exist
echo "🔧 Ensuring namespace exists..."
kubectl create namespace $K8S_NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Apply Kubernetes manifests for each service
echo "📦 Applying Kubernetes manifests..."
for SERVICE in "${SERVICES[@]}"; do
    service_name=$(echo $SERVICE | tr '_' '-')
    echo "Deploying $service_name..."
    kubectl apply -f "$K8S_MANIFEST_PATH/$SERVICE/"
done

# Wait for deployments to be ready
echo "⏳ Waiting for deployments to be ready..."
for SERVICE in "${SERVICES[@]}"; do
    service_name=$(echo $SERVICE | tr '_' '-')
    echo "Checking deployment for $service_name..."
    kubectl rollout status deployment/$service_name --timeout=$DEPLOYMENT_TIMEOUT
done

# Print deployment status
echo "📊 Pod status:"
kubectl get pods

echo "🌐 Service endpoints:"
kubectl get ingress

echo "✅ All services deployed successfully!"
