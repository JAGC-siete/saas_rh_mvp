#!/bin/bash
echo "🔍 Pre-build verification script"

# Check for merge conflicts
echo "Checking for merge conflicts..."
if grep -r "<<<<<<< HEAD" . --exclude-dir=node_modules --exclude-dir=.git; then
    echo "❌ MERGE CONFLICTS FOUND! Please resolve before building."
    exit 1
fi

# Check for missing files
echo "Checking critical files..."
REQUIRED_FILES=(
    "components/ui/textarea.tsx"
    "pages/asistencia-nueva.tsx" 
    "lib/supabase/server.ts"
    "lib/utils.ts"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing required file: $file"
        exit 1
    else
        echo "✅ Found: $file"
    fi
done

# Check TypeScript compilation
echo "Running TypeScript check..."
npx tsc --noEmit --skipLibCheck || {
    echo "❌ TypeScript compilation failed"
    exit 1
}

echo "✅ All pre-build checks passed!"
