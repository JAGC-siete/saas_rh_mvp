#!/bin/bash

# Pre-commit hook to detect secrets and validate environment setup
# Install with: ln -s ../../scripts/pre-commit.sh .git/hooks/pre-commit

set -e

echo "🔍 Running pre-commit security checks..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Check for potential secrets in staged files
check_secrets() {
    print_status $YELLOW "Checking for potential secrets..."
    
    # Patterns to look for
    local secret_patterns=(
        "sk_live_[a-zA-Z0-9_]+"           # Stripe live keys
        "sk_test_[a-zA-Z0-9_]{24,}"       # Stripe test keys (but allow placeholders)
        "pk_live_[a-zA-Z0-9_]+"           # Stripe live public keys
        "[a-zA-Z0-9_]{32,}@[a-zA-Z0-9_]+" # Potential service account emails
        "-----BEGIN [A-Z]+ KEY-----"      # Private keys
        "password.*=.*['\"][^'\"]{8,}"    # Actual passwords
        "secret.*=.*['\"][^'\"]{16,}"     # Actual secrets (not placeholders)
    )
    
    local found_secrets=false
    
    # Get staged files
    staged_files=$(git diff --cached --name-only --diff-filter=ACM)
    
    for file in $staged_files; do
        # Skip binary files and .env.example
        if [[ $file == *.env.example ]] || [[ $file == *test* ]] || [[ $file == *spec* ]]; then
            continue
        fi
        
        if [ -f "$file" ]; then
            for pattern in "${secret_patterns[@]}"; do
                if grep -qE "$pattern" "$file" 2>/dev/null; then
                    # Double check it's not a placeholder
                    if ! grep -qE "(PLACEHOLDER|placeholder|paste_your|generate_|your_)" "$file" 2>/dev/null; then
                        print_status $RED "❌ Potential secret found in $file"
                        found_secrets=true
                    fi
                fi
            done
        fi
    done
    
    if [ "$found_secrets" = true ]; then
        print_status $RED "❌ Potential secrets detected. Please review your changes."
        exit 1
    fi
    
    print_status $GREEN "✅ No secrets detected"
}

# Check .env.example for proper placeholders
check_env_example() {
    print_status $YELLOW "Validating .env.example..."
    
    if [ -f ".env.example" ]; then
        # Check that .env.example doesn't contain real values
        local suspicious_patterns=(
            "eyJ[a-zA-Z0-9_-]{50,}"  # JWT tokens that look real
            "sk_[a-zA-Z0-9_]{30,}"   # Stripe keys that look real
            "postgresql://[^:]+:[^@]+@[^/]+/[^#\s]+" # Real DB URLs
        )
        
        for pattern in "${suspicious_patterns[@]}"; do
            if grep -qE "$pattern" ".env.example"; then
                # Check if it's actually a placeholder
                if ! grep -qE "(PLACEHOLDER|placeholder|XXXXX)" ".env.example"; then
                    print_status $RED "❌ .env.example may contain real credentials"
                    print_status $YELLOW "Please use PLACEHOLDER values in .env.example"
                    exit 1
                fi
            fi
        done
    fi
    
    print_status $GREEN "✅ .env.example validation passed"
}

# Check for .env files being committed
check_env_files() {
    print_status $YELLOW "Checking for environment files..."
    
    staged_env_files=$(git diff --cached --name-only | grep -E "^\.env$|^\.env\." | grep -v ".env.example" || true)
    
    if [ -n "$staged_env_files" ]; then
        print_status $RED "❌ Environment files should not be committed:"
        echo "$staged_env_files"
        print_status $YELLOW "Use 'git reset HEAD <file>' to unstage these files"
        exit 1
    fi
    
    print_status $GREEN "✅ No environment files being committed"
}

# Main execution
main() {
    check_env_files
    check_env_example
    check_secrets
    
    print_status $GREEN "🎉 All pre-commit checks passed!"
}

# Run main function
main
