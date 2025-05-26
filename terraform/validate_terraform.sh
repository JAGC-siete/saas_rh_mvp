#!/bin/bash

set -e  # Exit on error

echo "Starting phased Terraform deployment..."

# Function to execute terraform apply with error checking
apply_terraform() {
    local target=$1
    local phase=$2
    
    echo "Phase ${phase}: Applying ${target}"
    if ! terraform apply -target=${target} -auto-approve; then
        echo "Error in Phase ${phase}: Failed to apply ${target}"
        exit 1
    fi
}

# Phase 1: Base Infrastructure
echo "Phase 1: Deploying Base Infrastructure"
apply_terraform "module.vpc" "1.1"
apply_terraform "module.kms" "1.2"

# Phase 2: Security Groups
echo "Phase 2: Deploying Security Groups"
apply_terraform "module.security_groups" "2"

# Phase 3: EKS Cluster Core
echo "Phase 3: Deploying EKS Cluster Core"
apply_terraform "module.eks.aws_eks_cluster.main" "3"

# Phase 4: Databases
echo "Phase 4: Deploying Databases"
apply_terraform "module.rds" "4.1"
apply_terraform "module.elasticache" "4.2"

# Phase 5: EKS Node Groups
echo "Phase 5: Deploying EKS Node Groups"
apply_terraform "module.eks" "5"

# Phase 6: Security Rules
echo "Phase 6: Deploying Security Rules"
apply_terraform "module.security_rules" "6"

# Phase 7: Monitoring and DNS
echo "Phase 7: Deploying Monitoring and DNS"
apply_terraform "module.monitoring" "7.1"
apply_terraform "module.dns" "7.2"

# Phase 8: Final deployment
echo "Phase 8: Deploying remaining resources"
if ! terraform apply -auto-approve; then
    echo "Error in Phase 8: Failed to apply remaining resources"
    exit 1
fi

echo "Deployment completed successfully!"
