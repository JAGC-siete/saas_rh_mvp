#!/bin/bash

# Professional Environment Setup Script
# This script helps developers set up their environment variables

set -e

echo "🔧 Setting up environment variables..."

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists. Backing up..."
    cp .env.local .env.local.backup
fi

# Copy example file
if [ -f ".env.example" ]; then
    cp .env.example .env.local
    echo "✅ Created .env.local from .env.example"
else
    echo "❌ .env.example not found. Please create it first."
    exit 1
fi

echo ""
echo "📋 Next steps:"
echo "1. Edit .env.local with your actual values"
echo "2. Get Supabase credentials from your project dashboard"
echo "3. Never commit .env.local to version control"
echo ""
echo "🔐 For production deployment:"
echo "- Set environment variables in Railway/Vercel dashboard"
echo "- Use Railway CLI: railway variables set KEY=value"
echo ""
echo "✅ Environment setup complete!" 