// Environment Variables Configuration
// This file ensures all required environment variables are properly loaded

// Load environment variables on server-side
if (typeof window === 'undefined') {
  try {
    require('dotenv').config()
  } catch (error) {
    console.warn('⚠️ Could not load dotenv:', error)
  }
}

// Simplified environment variable getter
function getEnvVar(key: string, fallback: string = ''): string {
  // For NEXT_PUBLIC_ variables, they should be available in both server and client
  if (process.env[key]) {
    return process.env[key]!
  }
  
  // For client-side, NEXT_PUBLIC_ variables are automatically available
  if (typeof window !== 'undefined' && process.env[key]) {
    return process.env[key]!
  }
  
  return fallback
}

export const env = {
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: getEnvVar('NEXT_PUBLIC_SUPABASE_URL', ''),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', ''),
  SUPABASE_SERVICE_ROLE_KEY: getEnvVar('SUPABASE_SERVICE_ROLE_KEY', ''),
  
  // Application Configuration
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  NEXT_PUBLIC_SITE_URL: getEnvVar('NEXT_PUBLIC_SITE_URL', 'https://humanosisu.net'),
  NEXT_TELEMETRY_DISABLED: getEnvVar('NEXT_TELEMETRY_DISABLED', '1'),
  SKIP_ENV_VALIDATION: getEnvVar('SKIP_ENV_VALIDATION', 'false'),
  BASES_DE_DATOS_URL: getEnvVar('BASES_DE_DATOS_URL', 'https://humanosisu.net'),
  
  // Database Configuration
  DATABASE_URL: getEnvVar('DATABASE_URL', ''),
  
  // Security Configuration
  JWT_SECRET: getEnvVar('JWT_SECRET', ''),
  SUPABASE_JWT_SECRET: getEnvVar('SUPABASE_JWT_SECRET', ''),
  SESSION_SECRET: getEnvVar('SESSION_SECRET', ''),
  
  // Timezone Configuration
  TZ: getEnvVar('TZ', 'America/Tegucigalpa'),
  DEFAULT_TIMEZONE: getEnvVar('DEFAULT_TIMEZONE', 'America/Tegucigalpa'),
  DEFAULT_CURRENCY: getEnvVar('DEFAULT_CURRENCY', 'HNL'),
  
  // Railway Configuration
  RAILWAY_ENVIRONMENT: getEnvVar('RAILWAY_ENVIRONMENT', ''),
  RAILWAY_PUBLIC_DOMAIN: getEnvVar('RAILWAY_PUBLIC_DOMAIN', ''),
  PORT: getEnvVar('PORT', '8080'),
  HOSTNAME: getEnvVar('HOSTNAME', '0.0.0.0'),
  
  // External Services
  CRON_SECRET: getEnvVar('CRON_SECRET', ''),
  RESEND_API_KEY: getEnvVar('RESEND_API_KEY', ''),
  
  // Supabase Auth External Providers
  SUPABASE_AUTH_EXTERNAL_FACEBOOK_SECRET: getEnvVar('SUPABASE_AUTH_EXTERNAL_FACEBOOK_SECRET', ''),
  SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN: getEnvVar('SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN', ''),
  
  // Twilio Configuration
  AUTH_TOKEN: getEnvVar('auth_token', ''),
}

// Validation function to check if required environment variables are set
export function validateEnv() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL',
    'JWT_SECRET',
    'SUPABASE_JWT_SECRET',
    'SESSION_SECRET',
  ]
  
  const missing = required.filter(key => !env[key as keyof typeof env])
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing)
    console.error('Current env values:', {
      NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing',
      DATABASE_URL: env.DATABASE_URL ? '✅ Set' : '❌ Missing',
      JWT_SECRET: env.JWT_SECRET ? '✅ Set' : '❌ Missing',
      SUPABASE_JWT_SECRET: env.SUPABASE_JWT_SECRET ? '✅ Set' : '❌ Missing',
      SESSION_SECRET: env.SESSION_SECRET ? '✅ Set' : '❌ Missing',
    })
    console.error('Process.env check:', {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing',
      DATABASE_URL: process.env.DATABASE_URL ? '✅ Set' : '❌ Missing',
    })
    return false
  }
  
  console.log('✅ All required environment variables are set')
  return true
}

// Simplified function to check if environment variables are available
export function areEnvVarsAvailable(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

// Don't validate immediately on import - wait for variables to be loaded
// Only log the current state for debugging
if (typeof window === 'undefined') {
  // Server-side: just log current state
  console.log('🔍 Server-side environment check:', {
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
  })
} else {
  // Client-side: just log current state
  console.log('🔍 Client-side environment check:', {
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
  })
}
