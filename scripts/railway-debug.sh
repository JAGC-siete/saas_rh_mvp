#!/bin/bash

echo "🔍 RAILWAY BUILD DIAGNOSTICS"
echo "============================="

echo "📋 Environment Info:"
node --version
npm --version
echo "Working directory: $(pwd)"
echo "Files in root: $(ls -la | wc -l)"

echo "📦 Package.json check:"
if [ -f "package.json" ]; then
    echo "✅ package.json exists"
    echo "Dependencies count: $(jq '.dependencies | length' package.json)"
    echo "DevDependencies count: $(jq '.devDependencies | length' package.json)"
else
    echo "❌ package.json missing"
fi

echo "🔧 npm ci test:"
npm ci --omit=dev --dry-run

echo "📁 Directory structure:"
find . -maxdepth 2 -type d | head -10
