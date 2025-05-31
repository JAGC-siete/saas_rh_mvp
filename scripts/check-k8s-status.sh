#!/bin/bash

# Check Kubernetes deployment status
# Usage: ./check-k8s-status.sh [namespace]

NAMESPACE=${1:-humanosisu}
TIMESTAMP=$(date +%Y-%m-%d-%H:%M:%S)
LOG_FILE="k8s-status-$TIMESTAMP.log"

# Text colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "====================================================="
echo -e "${YELLOW}Kubernetes Status Check - $(date)${NC}"
echo "====================================================="
echo

# Make sure kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}kubectl could not be found. Please install it first.${NC}"
    exit 1
fi

# Check if we can access the cluster
if ! kubectl cluster-info > /dev/null 2>&1; then
    echo -e "${RED}Cannot connect to Kubernetes cluster. Please check your kubeconfig.${NC}"
    exit 1
fi

# Function to get deployment status
check_deployments() {
    echo -e "${YELLOW}Checking Deployments in namespace: $NAMESPACE${NC}"
    echo "-----------------------------------------------------"
    
    deployments=($(kubectl get deployments -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}'))
    
    if [ ${#deployments[@]} -eq 0 ]; then
        echo -e "${YELLOW}No deployments found in namespace $NAMESPACE${NC}"
        return
    fi
    
    for deployment in ${deployments[@]}; do
        replicas=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.status.replicas}')
        available=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.status.availableReplicas}')
        ready_percent=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.status.conditions[?(@.type=="Available")].status}')
        
        echo -en "Deployment $deployment: "
        
        if [ "$ready_percent" == "True" ]; then
            echo -e "${GREEN}HEALTHY${NC} ($available/$replicas replicas available)"
        else
            echo -e "${RED}UNHEALTHY${NC} ($available/$replicas replicas available)"
        fi
    done
    echo
}

# Function to check service endpoints
check_services() {
    echo -e "${YELLOW}Checking Services in namespace: $NAMESPACE${NC}"
    echo "-----------------------------------------------------"
    
    services=($(kubectl get services -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}' | tr ' ' '\n' | grep -v kubernetes))
    
    if [ ${#services[@]} -eq 0 ]; then
        echo -e "${YELLOW}No services found in namespace $NAMESPACE${NC}"
        return
    fi
    
    for service in ${services[@]}; do
        service_type=$(kubectl get service $service -n $NAMESPACE -o jsonpath='{.spec.type}')
        endpoints=$(kubectl get endpoints $service -n $NAMESPACE -o jsonpath='{.subsets[*].addresses}')
        
        echo -en "Service $service ($service_type): "
        
        if [ -z "$endpoints" ]; then
            echo -e "${RED}NO ENDPOINTS${NC}"
        else
            echo -e "${GREEN}ENDPOINTS AVAILABLE${NC}"
        fi
    done
    echo
}

# Function to check Pod status
check_pods() {
    echo -e "${YELLOW}Checking Pods in namespace: $NAMESPACE${NC}"
    echo "-----------------------------------------------------"
    
    # Get counts by status
    running_pods=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running --no-headers | wc -l | xargs)
    pending_pods=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Pending --no-headers | wc -l | xargs)
    failed_pods=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Failed --no-headers | wc -l | xargs)
    
    echo -e "Running: ${GREEN}$running_pods${NC}, Pending: ${YELLOW}$pending_pods${NC}, Failed: ${RED}$failed_pods${NC}"
    
    # List problematic pods if any
    if [ $pending_pods -gt 0 ] || [ $failed_pods -gt 0 ]; then
        echo -e "\n${YELLOW}Problematic pods:${NC}"
        kubectl get pods -n $NAMESPACE --field-selector=status.phase!=Running
    fi
    echo
}

# Function to check resource usage
check_resources() {
    echo -e "${YELLOW}Resource Usage in namespace: $NAMESPACE${NC}"
    echo "-----------------------------------------------------"
    
    echo "Top 5 CPU-consuming pods:"
    kubectl top pods -n $NAMESPACE --sort-by=cpu | head -6
    
    echo -e "\nTop 5 Memory-consuming pods:"
    kubectl top pods -n $NAMESPACE --sort-by=memory | head -6
    echo
}

# Function to check HPA status
check_hpas() {
    echo -e "${YELLOW}Checking HPAs in namespace: $NAMESPACE${NC}"
    echo "-----------------------------------------------------"
    
    if ! kubectl get hpa -n $NAMESPACE &> /dev/null; then
        echo -e "${YELLOW}No HPAs found in namespace $NAMESPACE${NC}"
        return
    fi
    
    kubectl get hpa -n $NAMESPACE
    echo
}

# Run all checks and save to log
{
    check_deployments
    check_services
    check_pods
    check_resources
    check_hpas
} | tee "$LOG_FILE"

echo -e "${GREEN}Status check completed. Results saved to $LOG_FILE${NC}"
