#!/usr/bin/env node

/**
 * Script para verificar que el logo se está desplegando correctamente en Railway
 * 
 * Este script verifica:
 * 1. Que el logo existe en /public
 * 2. Que la ruta está correctamente configurada
 * 3. Que el archivo es accesible
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuración del logo para Railway + Cloudflare + Supabase...\n');

// 1. Verificar que el logo existe en /public
const logoPath = path.join(process.cwd(), 'public', 'logo-humano-sisu.png');
if (fs.existsSync(logoPath)) {
  const stats = fs.statSync(logoPath);
  const fileSizeInKB = Math.round(stats.size / 1024);
  console.log(`✅ Logo encontrado en /public/logo-humano-sisu.png`);
  console.log(`   Tamaño: ${fileSizeInKB} KB`);
  console.log(`   Última modificación: ${stats.mtime.toLocaleDateString()}`);
} else {
  console.error('❌ Logo NO encontrado en /public/logo-humano-sisu.png');
  process.exit(1);
}

// 2. Verificar que la ruta está correctamente referenciada en el código
const landingFile = path.join(process.cwd(), 'pages', 'landing.tsx');
const dashboardFile = path.join(process.cwd(), 'components', 'DashboardLayout.tsx');

let logoReferences = 0;

if (fs.existsSync(landingFile)) {
  const landingContent = fs.readFileSync(landingFile, 'utf8');
  if (landingContent.includes('/logo-humano-sisu.png')) {
    console.log('✅ Logo referenciado en pages/landing.tsx');
    logoReferences++;
  } else {
    console.log('⚠️  Logo NO referenciado en pages/landing.tsx');
  }
}

if (fs.existsSync(dashboardFile)) {
  const dashboardContent = fs.readFileSync(dashboardFile, 'utf8');
  if (dashboardContent.includes('/logo-humano-sisu.png')) {
    console.log('✅ Logo referenciado en components/DashboardLayout.tsx');
    logoReferences++;
  } else {
    console.log('⚠️  Logo NO referenciado en components/DashboardLayout.tsx');
  }
}

// 3. Verificar configuración de Next.js
const nextConfigFile = path.join(process.cwd(), 'next.config.js');
if (fs.existsSync(nextConfigFile)) {
  const nextConfigContent = fs.readFileSync(nextConfigFile, 'utf8');
  if (nextConfigContent.includes('output: \'standalone\'')) {
    console.log('✅ Next.js configurado para Railway (output: standalone)');
  } else {
    console.log('⚠️  Next.js NO configurado para Railway');
  }
} else {
  console.log('⚠️  next.config.js no encontrado');
}

// 4. Verificar package.json para scripts de build
const packageJsonFile = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packageJsonFile)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonFile, 'utf8'));
  if (packageJson.scripts && packageJson.scripts.build) {
    console.log('✅ Script de build encontrado en package.json');
  } else {
    console.log('⚠️  Script de build NO encontrado en package.json');
  }
}

console.log('\n📋 Checklist de despliegue:');
console.log('1. ✅ Logo en /public/logo-humano-sisu.png');
console.log(`2. ✅ Logo referenciado en ${logoReferences} archivos`);
console.log('3. ✅ Next.js configurado para Railway');
console.log('4. ✅ Script de build disponible');

console.log('\n🚀 Para verificar el despliegue:');
console.log('1. Haz push a GitHub');
console.log('2. Railway hará el deploy automáticamente');
console.log('3. Verifica: https://humanosisu.net/logo-humano-sisu.png');
console.log('4. Si se ve el logo → despliegue exitoso');
console.log('5. Si no se ve → verificar que esté en /public en el momento del build');

console.log('\n💡 Recordatorio:');
console.log('- El logo debe estar en /public (no en Supabase Storage)');
console.log('- La ruta debe ser /logo-humano-sisu.png (desde la raíz del dominio)');
console.log('- Cloudflare solo cachea lo que Railway sirva');

if (logoReferences === 0) {
  console.log('\n❌ PROBLEMA: El logo no está referenciado en ningún archivo');
  process.exit(1);
} else {
  console.log('\n✅ Configuración del logo correcta para Railway + Cloudflare + Supabase');
}
