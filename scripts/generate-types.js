#!/usr/bin/env node

/**
 * Script para generar tipos TypeScript desde OpenAPI contract
 * Ejecuta: node scripts/generate-types.js
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 Generating TypeScript types from OpenAPI contract...')

try {
  // Verificar que existe openapi.yaml
  const openapiPath = path.join(process.cwd(), 'openapi.yaml')
  if (!fs.existsSync(openapiPath)) {
    throw new Error('openapi.yaml not found in project root')
  }

  // Crear directorio src/types si no existe
  const typesDir = path.join(process.cwd(), 'src', 'types')
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true })
  }

  // Generar tipos desde OpenAPI
  const outputPath = path.join(typesDir, 'api.d.ts')
  execSync(`npx openapi-typescript openapi.yaml -o ${outputPath}`, {
    stdio: 'inherit',
    cwd: process.cwd()
  })

  console.log('✅ TypeScript types generated successfully!')
  console.log(`📁 Output: ${outputPath}`)

  // Verificar que el archivo se generó correctamente
  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath)
    console.log(`📊 File size: ${stats.size} bytes`)
  }

} catch (error) {
  console.error('❌ Error generating types:', error.message)
  process.exit(1)
}
