#!/bin/bash

# HR SaaS Complete System Audit Script
# This script runs both the system audit and Supabase audit, then generates a consolidated report

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "${PURPLE}$1${NC}"
}

# Check if we're in the project root
if [ ! -f "package.json" ]; then
    print_error "This script must be run from the project root directory"
    exit 1
fi

# Create audit directory
AUDIT_DIR="audit-reports"
mkdir -p "$AUDIT_DIR"

print_header "🚀 HR SaaS Complete System Audit"
echo "=================================================="
print_status "Starting comprehensive system audit..."

# Step 1: Run system audit
print_status "Step 1: Running system architecture audit..."
if node scripts/audit-system.js; then
    print_success "System audit completed"
    # Move the report to audit directory
    if [ -f "audit-report.json" ]; then
        mv audit-report.json "$AUDIT_DIR/system-audit-report.json"
    fi
else
    print_warning "System audit completed with issues"
    # Move the report to audit directory
    if [ -f "audit-report.json" ]; then
        mv audit-report.json "$AUDIT_DIR/system-audit-report.json"
    fi
fi

echo ""

# Step 2: Run Supabase audit
print_status "Step 2: Running Supabase database audit..."
if node scripts/audit-supabase.js; then
    print_success "Supabase audit completed"
    # Move the report to audit directory
    if [ -f "supabase-audit-report.json" ]; then
        mv supabase-audit-report.json "$AUDIT_DIR/supabase-audit-report.json"
    fi
else
    print_warning "Supabase audit completed with issues"
    # Move the report to audit directory
    if [ -f "supabase-audit-report.json" ]; then
        mv supabase-audit-report.json "$AUDIT_DIR/supabase-audit-report.json"
    fi
fi

echo ""

# Step 3: Generate consolidated report
print_status "Step 3: Generating consolidated report..."

# Create consolidated report
cat > "$AUDIT_DIR/consolidated-audit-report.md" << 'EOF'
# HR SaaS System - Consolidated Audit Report

Generated on: $(date '+%Y-%m-%d %H:%M:%S')

## Overview

This report consolidates the results from both the system architecture audit and the Supabase database audit.

## System Architecture Audit Results

EOF

# Add system audit results if available
if [ -f "$AUDIT_DIR/system-audit-report.json" ]; then
    echo "### Summary" >> "$AUDIT_DIR/consolidated-audit-report.md"
    node -e "
        const report = JSON.parse(require('fs').readFileSync('$AUDIT_DIR/system-audit-report.json', 'utf8'));
        console.log(\`- Total Checks: \${report.summary.total}\`);
        console.log(\`- Passed: \${report.summary.passed}\`);
        console.log(\`- Failed: \${report.summary.failed}\`);
        console.log(\`- Warnings: \${report.summary.warnings}\`);
        console.log(\`- Info: \${report.summary.info}\`);
    " >> "$AUDIT_DIR/consolidated-audit-report.md"
    
    echo "" >> "$AUDIT_DIR/consolidated-audit-report.md"
    echo "### Failed Checks" >> "$AUDIT_DIR/consolidated-audit-report.md"
    node -e "
        const report = JSON.parse(require('fs').readFileSync('$AUDIT_DIR/system-audit-report.json', 'utf8'));
        report.results.failed.forEach(item => {
            console.log(\`- **\${item.category}**: \${item.message}\`);
        });
    " >> "$AUDIT_DIR/consolidated-audit-report.md"
    
    echo "" >> "$AUDIT_DIR/consolidated-audit-report.md"
    echo "### Warnings" >> "$AUDIT_DIR/consolidated-audit-report.md"
    node -e "
        const report = JSON.parse(require('fs').readFileSync('$AUDIT_DIR/system-audit-report.json', 'utf8'));
        report.results.warnings.forEach(item => {
            console.log(\`- **\${item.category}**: \${item.message}\`);
        });
    " >> "$AUDIT_DIR/consolidated-audit-report.md"
else
    echo "System audit report not available." >> "$AUDIT_DIR/consolidated-audit-report.md"
fi

# Add Supabase audit results
cat >> "$AUDIT_DIR/consolidated-audit-report.md" << 'EOF'

## Supabase Database Audit Results

EOF

if [ -f "$AUDIT_DIR/supabase-audit-report.json" ]; then
    echo "### Summary" >> "$AUDIT_DIR/consolidated-audit-report.md"
    node -e "
        const report = JSON.parse(require('fs').readFileSync('$AUDIT_DIR/supabase-audit-report.json', 'utf8'));
        console.log(\`- Total Checks: \${report.summary.total}\`);
        console.log(\`- Passed: \${report.summary.passed}\`);
        console.log(\`- Failed: \${report.summary.failed}\`);
        console.log(\`- Warnings: \${report.summary.warnings}\`);
        console.log(\`- Info: \${report.summary.info}\`);
    " >> "$AUDIT_DIR/consolidated-audit-report.md"
    
    echo "" >> "$AUDIT_DIR/consolidated-audit-report.md"
    echo "### Failed Checks" >> "$AUDIT_DIR/consolidated-audit-report.md"
    node -e "
        const report = JSON.parse(require('fs').readFileSync('$AUDIT_DIR/supabase-audit-report.json', 'utf8'));
        report.results.failed.forEach(item => {
            console.log(\`- **\${item.category}**: \${item.message}\`);
        });
    " >> "$AUDIT_DIR/consolidated-audit-report.md"
    
    echo "" >> "$AUDIT_DIR/consolidated-audit-report.md"
    echo "### Warnings" >> "$AUDIT_DIR/consolidated-audit-report.md"
    node -e "
        const report = JSON.parse(require('fs').readFileSync('$AUDIT_DIR/supabase-audit-report.json', 'utf8'));
        report.results.warnings.forEach(item => {
            console.log(\`- **\${item.category}**: \${item.message}\`);
        });
    " >> "$AUDIT_DIR/consolidated-audit-report.md"
else
    echo "Supabase audit report not available." >> "$AUDIT_DIR/consolidated-audit-report.md"
fi

# Add recommendations section
cat >> "$AUDIT_DIR/consolidated-audit-report.md" << 'EOF'

## Recommendations

### High Priority
- Address all failed checks immediately
- Review and fix security vulnerabilities
- Ensure proper RLS policies are in place

### Medium Priority
- Address warnings to improve system robustness
- Review TypeScript configuration
- Optimize database queries

### Low Priority
- Consider implementing additional security measures
- Review and optimize build configuration
- Add comprehensive error handling

## Next Steps

1. Review the detailed reports in the audit-reports directory
2. Address failed checks according to priority
3. Re-run the audit after making changes
4. Consider implementing automated audits in CI/CD pipeline

## Files Generated

- `audit-reports/system-audit-report.json` - Detailed system architecture audit
- `audit-reports/supabase-audit-report.json` - Detailed Supabase database audit
- `audit-reports/consolidated-audit-report.md` - This consolidated report

EOF

print_success "Consolidated report generated: $AUDIT_DIR/consolidated-audit-report.md"

# Step 4: Display summary
echo ""
print_header "📊 AUDIT SUMMARY"
echo "=================================================="

# Count total issues
TOTAL_FAILED=0
TOTAL_WARNINGS=0

if [ -f "$AUDIT_DIR/system-audit-report.json" ]; then
    SYSTEM_FAILED=$(node -e "const r = JSON.parse(require('fs').readFileSync('$AUDIT_DIR/system-audit-report.json', 'utf8')); console.log(r.summary.failed)")
    SYSTEM_WARNINGS=$(node -e "const r = JSON.parse(require('fs').readFileSync('$AUDIT_DIR/system-audit-report.json', 'utf8')); console.log(r.summary.warnings)")
    TOTAL_FAILED=$((TOTAL_FAILED + SYSTEM_FAILED))
    TOTAL_WARNINGS=$((TOTAL_WARNINGS + SYSTEM_WARNINGS))
    echo "System Audit: $SYSTEM_FAILED failed, $SYSTEM_WARNINGS warnings"
fi

if [ -f "$AUDIT_DIR/supabase-audit-report.json" ]; then
    SUPABASE_FAILED=$(node -e "const r = JSON.parse(require('fs').readFileSync('$AUDIT_DIR/supabase-audit-report.json', 'utf8')); console.log(r.summary.failed)")
    SUPABASE_WARNINGS=$(node -e "const r = JSON.parse(require('fs').readFileSync('$AUDIT_DIR/supabase-audit-report.json', 'utf8')); console.log(r.summary.warnings)")
    TOTAL_FAILED=$((TOTAL_FAILED + SUPABASE_FAILED))
    TOTAL_WARNINGS=$((TOTAL_WARNINGS + SUPABASE_WARNINGS))
    echo "Supabase Audit: $SUPABASE_FAILED failed, $SUPABASE_WARNINGS warnings"
fi

echo ""
echo "Total Issues: $TOTAL_FAILED failed, $TOTAL_WARNINGS warnings"

if [ $TOTAL_FAILED -eq 0 ]; then
    print_success "🎉 All audits passed! Your system is compliant with the architecture requirements."
    exit 0
else
    print_warning "⚠️  Some issues were found. Please review the reports and address the failed checks."
    print_status "Reports available in: $AUDIT_DIR/"
    exit 1
fi 