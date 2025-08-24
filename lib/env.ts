// Environment Variables Configuration
// This file ensures all required environment variables are properly loaded

// For Railway deployment, we need to handle runtime environment variables
function getEnvVar(key: string, fallback: string = ''): string {
  // First try to get from process.env (build time)
  if (process.env[key]) {
    return process.env[key]!
  }
  
  // For client-side, try to get from window.__ENV__ if available
  if (typeof window !== 'undefined' && (window as any).__ENV__) {
    return (window as any).__ENV__[key] || fallback
  }
  
  // For Railway runtime, try to get from global scope
  if (typeof global !== 'undefined' && (global as any)[key]) {
    return (global as any)[key]
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
  NEXT_PUBLIC_SITE_URL: getEnvVar('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000'),
  
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
  PORT: getEnvVar('PORT', '3000'),
  HOSTNAME: getEnvVar('HOSTNAME', 'localhost'),
}

// Validation function to check if required environment variables are set
export function validateEnv() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ]
  
  const missing = required.filter(key => !env[key as keyof typeof env])
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing)
    console.error('Current env values:', {
      NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
    })
    console.error('Process.env check:', {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
    })
    return false
  }
  
  console.log('✅ All required environment variables are set')
  return true
}

// Function to refresh environment variables from window.__ENV__
export function refreshEnvFromWindow() {
  if (typeof window !== 'undefined' && (window as any).__ENV__) {
    const windowEnv = (window as any).__ENV__
    
    // Update the env object with values from window
    Object.keys(windowEnv).forEach(key => {
      if (key in env) {
        (env as any)[key] = windowEnv[key]
      }
    })
    
    console.log('🔄 Environment variables refreshed from window:', {
      NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
    })
    
    return true
  }
  return false
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
