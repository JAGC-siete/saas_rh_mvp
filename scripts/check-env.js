#!/usr/bin/env node

/**
 * Environment validation script for Railway deployment
 * Checks if all required environment variables are properly configured
 */

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL=https://fwyxmovfrzauebiqxchz.supabase.co',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY=XXXXX', 
  'SUPABASE_SERVICE_ROLE_KEY=XXXXX',
  'JWT_SECRET=17UyEsHlyHlXCEpX/zPj2KPUNBRZN54JVMAY1b2k1lUWf6qqPeZz/XtLgdHK4KX/0OsWhqfYDtHgCM1dA3+W/g==',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL'
];

const optionalVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER', 
  'SMTP_PASS',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY'
];

function checkEnvironment() {
  console.log('🔍 Checking environment configuration for Railway...\n');
  
  let hasErrors = false;
  let hasWarnings = false;

  // Check required variables
  console.log('📋 Required Variables:');
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      console.log(`❌ ${varName}: Missing`);
      hasErrors = true;
    } else if (value.includes('PLACEHOLDER') || value.includes('placeholder') || value.includes('paste_your')) {
      console.log(`⚠️  ${varName}: Contains placeholder value`);
      hasErrors = true;
    } else {
      console.log(`✅ ${varName}: Configured`);
    }
  });

  console.log('\n📋 Optional Variables:');
  optionalVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      console.log(`⚪ ${varName}: Not set (optional)`);
    } else if (value.includes('PLACEHOLDER') || value.includes('placeholder')) {
      console.log(`⚠️  ${varName}: Contains placeholder value`);
      hasWarnings = true;
    } else {
      console.log(`✅ ${varName}: Configured`);
    }
  });

  // Environment-specific checks
  console.log('\n🏗️  Environment-specific checks:');
  
  const nodeEnv = process.env.NODE_ENV;
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  
  if (nodeEnv === 'production') {
    if (nextAuthUrl && nextAuthUrl.includes('localhost')) {
      console.log('❌ NEXTAUTH_URL: Still pointing to localhost in production');
      hasErrors = true;
    } else {
      console.log('✅ NEXTAUTH_URL: Properly configured for production');
    }
  }

  // Railway-specific checks
  console.log('\n🚂 Railway-specific checks:');
  
  const port = process.env.PORT;
  if (port) {
    console.log(`✅ PORT: ${port} (Railway managed)`);
  } else {
    console.log('⚠️  PORT: Not set (Railway should provide this)');
    hasWarnings = true;
  }

  // Summary
  console.log('\n📊 Summary:');
  if (hasErrors) {
    console.log('❌ Configuration has errors - deployment may fail');
    console.log('\n🔧 To fix:');
    console.log('1. Set missing environment variables in Railway dashboard');
    console.log('2. Replace placeholder values with real credentials');
    console.log('3. Run this script again to verify');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('⚠️  Configuration has warnings but should work');
    console.log('✅ Safe to deploy to Railway');
  } else {
    console.log('✅ All environment variables properly configured');
    console.log('✅ Ready for Railway deployment');
  }
}

// Railway deployment instructions
function showRailwayInstructions() {
  console.log('\n📚 Railway Environment Variable Setup:');
  console.log('1. Visit your Railway project dashboard');
  console.log('2. Go to Variables tab');
  console.log('3. Add these variables:');
  console.log('');
  
  requiredVars.forEach(varName => {
    console.log(`   ${varName}=<your_actual_value>`);
  });
  
  console.log('');
  console.log('💡 Tips:');
  console.log('- Never put real credentials in .env.example');
  console.log('- Use Railway\'s Variables UI, not .env files');
  console.log('- NEXTAUTH_URL should be your Railway domain');
  console.log('- JWT_SECRET should be 32+ characters');
  console.log('');
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showRailwayInstructions();
} else {
  checkEnvironment();
}
