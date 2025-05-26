#!/bin/bash

# Update services to use correct ports
for service in nomina asistencia bases-de-datos; do
  if [ "$service" = "nomina" ]; then
    PORT=3002
  elif [ "$service" = "asistencia" ]; then
    PORT=3003
  else
    PORT=3000
  fi

  # Update deployment
  sed -i.bak "s/containerPort: 3000/containerPort: $PORT/" k8s/base/$service/deployment.yaml
  sed -i.bak "s/port: 3000/port: $PORT/" k8s/base/$service/deployment.yaml

  # Update service
  sed -i.bak "s/port: 80/port: $PORT/" k8s/base/$service/service.yaml
  sed -i.bak "s/targetPort: 3000/targetPort: $PORT/" k8s/base/$service/service.yaml
done

# Re-create configmaps and secrets
kubectl create namespace saas-rh 2>/dev/null || true

# Create ConfigMaps
kubectl create configmap db-config \
  --from-literal=host=postgres \
  --from-literal=port=5432 \
  --from-literal=database=saas_db \
  -n saas-rh --dry-run=client -o yaml | kubectl apply -f -

kubectl create configmap redis-config \
  --from-literal=host=redis \
  --from-literal=port=6379 \
  -n saas-rh --dry-run=client -o yaml | kubectl apply -f -

# Create Secrets
DB_PASSWORD=$(cat secrets/db_password.staging.txt)
REDIS_PASSWORD=$(openssl rand -base64 32)

kubectl create secret generic db-credentials \
  --from-literal=username=admin \
  --from-literal=password=$DB_PASSWORD \
  -n saas-rh --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic redis-credentials \
  --from-literal=password=$REDIS_PASSWORD \
  -n saas-rh --dry-run=client -o yaml | kubectl apply -f -

# Restart deployments
kubectl rollout restart deployment/nomina deployment/asistencia deployment/bases-de-datos -n saas-rh

echo "Deployment fixes completed! Please monitor the pods with:"
echo "kubectl get pods -n saas-rh -w"
