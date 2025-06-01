#!/usr/bin/env zsh

set -e

echo "Validating Terraform configuration..."

cd /Users/jorgearturo/saas-proyecto/terraform

# Initialize Terraform
terraform init

# Validate the configuration
terraform validate

# Plan the changes for staging
terraform plan -var-file=staging.tfvars -out=staging.plan

echo "Validation complete! Review the plan output above."
echo "To apply the changes, run: terraform apply staging.plan"
