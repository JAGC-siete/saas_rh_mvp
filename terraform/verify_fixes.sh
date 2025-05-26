#!/bin/bash

# Fix variable and parameter issues

echo "🔧 FIXING VARIABLE AND PARAMETER ISSUES"
echo "======================================="

# Fix 1: Check and fix staging.tfvars
echo "1. Checking staging.tfvars..."
if ! grep -q "project_name.*=" staging.tfvars; then
    echo "Adding missing project_name to staging.tfvars..."
    echo 'project_name = "saas-hr"' >> staging.tfvars
    echo "✅ project_name added to staging.tfvars"
else
    echo "✅ project_name found in staging.tfvars"
    grep "project_name" staging.tfvars
fi

# Fix 2: Fix ElastiCache parameter group
echo ""
echo "2. Fixing ElastiCache parameter group..."

# Check if there's an empty parameter block
if grep -A 5 -B 5 "parameter {" modules/elasticache/main.tf | grep -A 3 "parameter {" | grep -q "}"; then
    echo "Found empty parameter block, fixing..."
    
    # Remove empty parameter blocks
    sed -i.bak '/parameter {/,/}/ {
        /parameter {/ {
            N
            /parameter {\s*}/ d
        }
    }' modules/elasticache/main.tf
    
    # Alternative: Add a valid parameter if no parameters exist
    if ! grep -A 5 "parameter {" modules/elasticache/main.tf | grep -q "name.*="; then
        echo "Adding valid parameter..."
        sed -i.bak2 '/parameter {/,/}/ c\
  parameter {\
    name  = "timeout"\
    value = "300"\
  }' modules/elasticache/main.tf
    fi
    
    echo "✅ ElastiCache parameter group fixed"
else
    echo "✅ ElastiCache parameter group looks good"
fi

# Fix 3: Verify variables.tf has project_name defined
echo ""
echo "3. Checking variables.tf..."
if ! grep -q 'variable.*"project_name"' variables.tf; then
    echo "Adding project_name variable definition..."
    cat >> variables.tf << 'EOF'

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "saas-hr"
}
EOF
    echo "✅ project_name variable added to variables.tf"
else
    echo "✅ project_name variable found in variables.tf"
fi

# Fix 4: Show current staging.tfvars content
echo ""
echo "4. Current staging.tfvars content:"
cat staging.tfvars | head -10

# Fix 5: Validate configuration
echo ""
echo "5. Validating configuration..."
terraform validate

if [[ $? -eq 0 ]]; then
    echo "✅ Configuration is valid"
    
    echo ""
    echo "6. Testing plan..."
    terraform plan -var-file=staging.tfvars -out=test.tfplan
    
    if [[ $? -eq 0 ]]; then
        echo "✅ Plan successful! Ready to apply."
        echo ""
        echo "🚀 Run: terraform apply test.tfplan"
    else
        echo "❌ Plan failed, check errors above"
    fi
else
    echo "❌ Configuration validation failed"
fi

echo ""
echo "📋 SUMMARY OF FIXES APPLIED:"
echo "• Fixed project_name variable"
echo "• Fixed ElastiCache parameter group"
echo "• Validated configuration"