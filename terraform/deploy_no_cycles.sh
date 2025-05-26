#!/bin/bash

echo "🚀 DEPLOYING WITHOUT CIRCULAR DEPENDENCIES"
echo "=========================================="

set -e

# Use staging.tfvars if available
TFVARS_FILE=""
if [[ -f "staging.tfvars" ]]; then
    TFVARS_FILE="-var-file=staging.tfvars"
    echo "📋 Using staging.tfvars"
elif [[ -f "terraform.tfvars" ]]; then
    TFVARS_FILE="-var-file=terraform.tfvars"
    echo "📋 Using terraform.tfvars"
else
    echo "📋 Using default variables"
fi

# Initialize
echo "Phase 0: Initialization..."
terraform init -upgrade
terraform validate
echo "✅ Initialization complete"

# Phase 1: Base infrastructure
echo "Phase 1: Base infrastructure..."
terraform apply $TFVARS_FILE -target=module.vpc -auto-approve
terraform apply $TFVARS_FILE -target=module.kms -auto-approve
echo "✅ Phase 1 complete"

# Phase 2: Security groups
echo "Phase 2: Security groups..."
terraform apply $TFVARS_FILE -target=module.security_groups -auto-approve
echo "✅ Phase 2 complete"

# Phase 3: EKS
echo "Phase 3: EKS cluster..."
terraform apply $TFVARS_FILE -target=module.eks -auto-approve
echo "✅ Phase 3 complete"

# Phase 4: Databases
echo "Phase 4: Databases..."
terraform apply $TFVARS_FILE -target=module.rds -auto-approve
terraform apply $TFVARS_FILE -target=module.elasticache -auto-approve
echo "✅ Phase 4 complete"

# Phase 5: Monitoring (if exists)
echo "Phase 5: Monitoring..."
if terraform state list 2>/dev/null | grep -q "module.monitoring"; then
    terraform apply $TFVARS_FILE -target=module.monitoring -auto-approve
    echo "✅ Monitoring deployed"
else
    echo "ℹ️  No monitoring module found"
fi

# Phase 6: Security rules (if exists)
echo "Phase 6: Security rules..."
if terraform state list 2>/dev/null | grep -q "module.security_rules"; then
    terraform apply $TFVARS_FILE -target=module.security_rules -auto-approve
    echo "✅ Security rules deployed"
else
    echo "ℹ️  No security rules module found"
fi

# Phase 7: DNS (if exists)
echo "Phase 7: DNS..."
if terraform state list 2>/dev/null | grep -q "module.dns"; then
    terraform apply $TFVARS_FILE -target=module.dns -auto-approve
    echo "✅ DNS deployed"
else
    echo "ℹ️  No DNS module found"
fi

# Final apply
echo "Phase 8: Final apply..."
terraform apply $TFVARS_FILE -auto-approve
echo "✅ Final apply complete"

echo ""
echo "🎉 DEPLOYMENT SUCCESSFUL!"
echo "All modules deployed without circular dependency issues."

# Verify
echo "🔍 Verifying deployment..."
terraform plan $TFVARS_FILE -detailed-exitcode
if [[ $? -eq 0 ]]; then
    echo "✅ No pending changes detected"
elif [[ $? -eq 2 ]]; then
    echo "⚠️  Some changes still pending - review with 'terraform plan'"
fi

echo ""
echo "🎯 Next steps:"
echo "1. Update kubeconfig: aws eks update-kubeconfig --region us-east-1 --name \$(terraform output -raw cluster_name)"
echo "2. Test cluster: kubectl get nodes"
