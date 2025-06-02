#!/bin/zsh

# Test Redis connectivity in the cluster
echo "🔍 Testing Redis connectivity..."

# Get Redis pod name
REDIS_POD=$(kubectl get pod -n saas-rh -l app=redis -o jsonpath="{.items[0].metadata.name}")

if [ -z "$REDIS_POD" ]; then
    echo "❌ Redis pod not found. Please check if Redis is deployed correctly."
    exit 1
fi

# Test Redis connectivity from within the pod
echo "📝 Testing Redis PING from pod $REDIS_POD..."
kubectl exec -n saas-rh $REDIS_POD -- redis-cli ping

# Test Redis connectivity from each service
for SERVICE in "bases-de-datos" "asistencia" "nomina"; do
    echo "\n🔄 Testing Redis connection from $SERVICE service..."
    
    # Get service pod
    POD=$(kubectl get pod -n saas-rh -l app=$SERVICE -o jsonpath="{.items[0].metadata.name}")
    
    if [ -z "$POD" ]; then
        echo "⚠️ No pod found for $SERVICE"
        continue
    fi
    
    echo "📡 Testing connection from pod $POD..."
    kubectl exec -n saas-rh $POD -- wget -qO- http://localhost:3000/health
done

echo "\n✨ Redis connectivity test complete!"
