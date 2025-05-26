#!/bin/bash

# Create namespace if it doesn't exist
kubectl create namespace saas-rh --dry-run=client -o yaml | kubectl apply -f -

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

# Create PVC for Redis
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-pvc
  namespace: saas-rh
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
EOF

# Create PVC for nomina PDF storage
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nomina-pvc
  namespace: saas-rh
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
EOF

echo "Configuration setup completed!"
