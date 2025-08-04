#!/bin/bash

# Script para aplicar migración de corrección de triggers
echo "🔧 Aplicando migración de corrección de triggers..."

# Aplicar migración
supabase db push

echo "✅ Migración aplicada exitosamente"
echo "📦 Ahora puedes importar los datos:"
echo "   cd import-data"
echo "   node import-improved.js"
