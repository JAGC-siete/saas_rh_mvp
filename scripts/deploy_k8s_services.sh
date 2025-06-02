#!/bin/bash
set -e

# Configure AWS and kubectl
aws eks update-kubeconfig --region us-east-1 --name saas-rh-staging

# Log into ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 826726045450.dkr.ecr.us-east-1.amazonaws.com

# Create PostgreSQL PVC
echo "Creating PostgreSQL PVC..."
cat << 'EOF' | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: saas-rh
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
EOF

# Create PostgreSQL ConfigMap with init scripts
echo "Creating PostgreSQL ConfigMap..."
kubectl create configmap postgres-init-scripts -n saas-rh --from-file=/Users/jorgearturo/saas-proyecto/postgres-init/ || true

# Deploy PostgreSQL
echo "Deploying PostgreSQL..."
cat << 'EOF' | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: saas-rh
spec:
  selector:
    matchLabels:
      app: postgres
  replicas: 1
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:14-alpine
        env:
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        - name: POSTGRES_DB
          valueFrom:
            configMapKeyRef:
              name: db-config
              key: database
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        - name: init-scripts
          mountPath: /docker-entrypoint-initdb.d
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
      - name: init-scripts
        configMap:
          name: postgres-init-scripts
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: saas-rh
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
EOF

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL deployment to be ready..."
kubectl rollout status deployment/postgres -n saas-rh --timeout=300s

# Apply Redis resources first
echo "Deploying Redis resources..."
kubectl apply -f k8s/base/shared/redis-config.yaml
kubectl apply -f k8s/base/shared/redis-pvc.yaml
kubectl apply -f k8s/base/shared/redis-deployment.yaml
kubectl apply -f k8s/base/shared/redis-service.yaml

# Wait for Redis to be ready
echo "Waiting for Redis deployment to be ready..."
kubectl rollout status deployment/redis -n saas-rh --timeout=300s

# Apply remaining Kubernetes manifests
kubectl apply -f k8s/base/services/

# Wait for deployments to be ready
echo "Waiting for deployments to be ready..."
kubectl rollout status deployment/bases-de-datos -n saas-rh --timeout=300s
kubectl rollout status deployment/asistencia -n saas-rh --timeout=300s
kubectl rollout status deployment/nomina -n saas-rh --timeout=300s

# Print pod status
echo "Pod status:"
kubectl get pods -n saas-rh

echo "Service endpoints:"
kubectl get ingress -n saas-rh

echo "All services deployed successfully!"
