#!/bin/zsh

# Script to create AWS secrets in Kubernetes
# Usage: ./create_aws_secret.sh [AWS_ACCESS_KEY_ID] [AWS_SECRET_ACCESS_KEY]

source $(dirname $0)/../deploy/common/vars.sh

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY"
    exit 1
fi

AWS_ACCESS_KEY_ID=$1
AWS_SECRET_ACCESS_KEY=$2

# Create AWS secret yaml
cat > k8s/base/shared/aws-secret.yaml << EOL
apiVersion: v1
kind: Secret
metadata:
  name: aws-secret
  namespace: ${K8S_NAMESPACE}
type: Opaque
stringData:
  access_key_id: "${AWS_ACCESS_KEY_ID}"
  secret_access_key: "${AWS_SECRET_ACCESS_KEY}"
EOL

# Apply the secret to the cluster
kubectl apply -f k8s/base/shared/aws-secret.yaml

echo "✅ AWS secret created successfully in namespace ${K8S_NAMESPACE}"