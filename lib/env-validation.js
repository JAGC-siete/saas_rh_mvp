/**
 * Environment variables validation for Next.js build (CommonJS version)
 * Validates required environment variables at build time
 */

function validateEnvironment() {
  console.log('🔍 Validating environment variables...');

  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ];

  const errors = [];

  for (const varName of requiredVars) {
    const value = process.env[varName];
    
    if (!value) {
      errors.push(`❌ ${varName}: Missing`);
    } else if (value.includes('PLACEHOLDER') || value.includes('placeholder') || value.includes('paste_your')) {
      errors.push(`❌ ${varName}: Contains placeholder value`);
    }
  }

  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');
    errors.forEach(error => console.error(error));
    console.error('\n🔧 To fix: Set proper environment variables in Railway dashboard');
    throw new Error('Environment validation failed');
  }

  console.log('✅ Environment validation passed');
}

module.exports = { validateEnvironment };
