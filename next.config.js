/** @type {import('next').NextConfig} */

// Only validate env vars in production builds on Railway, not local development
if (process.env.NODE_ENV === 'production' && process.env.RAILWAY_ENVIRONMENT && process.env.SKIP_ENV_VALIDATION !== 'true') {
  require('./lib/env-validation').validateEnvironment();
}

const nextConfig = {
  reactStrictMode: true,
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
