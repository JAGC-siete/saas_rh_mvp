/**
 * Environment variables validation for Next.js build
 * Validates required environment variables at build time
 */

interface EnvConfig {
  // Supabase - Required
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;

  // JWT - Required
  JWT_SECRET: string;
  NEXTAUTH_SECRET: string;

  // App Configuration
  NEXTAUTH_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';

  // Optional (can be undefined)
  DATABASE_URL?: string;
  REDIS_URL?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
}

function validateEnvVar(key: string, value: string | undefined, required: boolean = false): string | undefined {
  if (required && (!value || value.trim() === '')) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  if (value && (
    value.includes('PLACEHOLDER') ||
    value.includes('paste_your') ||
    value.includes('generate_') ||
    value.includes('your_') ||
    value === 'http://localhost:3000' && process.env.NODE_ENV === 'production'
  )) {
    if (required) {
      throw new Error(`Environment variable ${key} contains placeholder value: ${value}`);
    }
    return undefined;
  }

  return value;
}

export function validateEnvironment(): EnvConfig {
  const env = process.env;
  
  console.log('🔍 Validating environment variables...');

  try {
    const validatedEnv: EnvConfig = {
      // Required Supabase vars
      NEXT_PUBLIC_SUPABASE_URL: validateEnvVar('NEXT_PUBLIC_SUPABASE_URL', env.NEXT_PUBLIC_SUPABASE_URL, true)!,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: validateEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', env.NEXT_PUBLIC_SUPABASE_ANON_KEY, true)!,
      SUPABASE_SERVICE_ROLE_KEY: validateEnvVar('SUPABASE_SERVICE_ROLE_KEY', env.SUPABASE_SERVICE_ROLE_KEY, true)!,

      // Required JWT vars
      JWT_SECRET: validateEnvVar('JWT_SECRET', env.JWT_SECRET, true)!,
      NEXTAUTH_SECRET: validateEnvVar('NEXTAUTH_SECRET', env.NEXTAUTH_SECRET, true)!,

      // App config
      NEXTAUTH_URL: validateEnvVar('NEXTAUTH_URL', env.NEXTAUTH_URL, true)!,
      NODE_ENV: (env.NODE_ENV as EnvConfig['NODE_ENV']) || 'development',

      // Optional vars
      DATABASE_URL: validateEnvVar('DATABASE_URL', env.DATABASE_URL),
      REDIS_URL: validateEnvVar('REDIS_URL', env.REDIS_URL),
      SMTP_HOST: validateEnvVar('SMTP_HOST', env.SMTP_HOST),
      SMTP_PORT: validateEnvVar('SMTP_PORT', env.SMTP_PORT),
      SMTP_USER: validateEnvVar('SMTP_USER', env.SMTP_USER),
      SMTP_PASS: validateEnvVar('SMTP_PASS', env.SMTP_PASS),
      STRIPE_SECRET_KEY: validateEnvVar('STRIPE_SECRET_KEY', env.STRIPE_SECRET_KEY),
      STRIPE_PUBLISHABLE_KEY: validateEnvVar('STRIPE_PUBLISHABLE_KEY', env.STRIPE_PUBLISHABLE_KEY),
    };

    console.log('✅ Environment validation passed');
    return validatedEnv;
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    throw error;
  }
}

// Validate on import in production builds
if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
  validateEnvironment();
}
