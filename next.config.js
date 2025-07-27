/** @type {import('next').NextConfig} */

// Temporarily disable env validation during build phase
// TODO: Re-enable after Railway environment variables are configured
// if (process.env.NODE_ENV === 'production' && process.env.RAILWAY_ENVIRONMENT && process.env.SKIP_ENV_VALIDATION !== 'true') {
//   require('./lib/env-validation').validateEnvironment();
// }

const nextConfig = {
  reactStrictMode: true,
  
  // Cache directory is controlled via NEXT_CACHE environment variable
  // Set in nixpacks.toml: export NEXT_CACHE=/tmp/next-cache
  
  images: {
    domains: ['localhost'],
  },
  // Environment variables are handled by Railway/Vercel/etc, not hardcoded here
  env: {},
  
  // Security headers for production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
