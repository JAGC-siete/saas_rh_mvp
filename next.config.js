/** @type {import('next').NextConfig} */
const path = require('path')
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig = {
  reactStrictMode: true,

  // Evita que Next infiera el workspace desde ~/package-lock.json (build standalone colgado/lento).
  outputFileTracingRoot: path.join(__dirname),

  images: {
    formats: ['image/avif', 'image/webp'],
  },

  /** Tree-shake barrel imports (lucide, heroicons, charts, motion, date-fns). */
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@heroicons/react',
      'date-fns',
      'recharts',
      'framer-motion',
    ],
  },

  /** pdfkit + dependencias usan require/fs; si Webpack los empaqueta mal, el PDF falla en runtime (500). */
  serverExternalPackages: ['pdfkit'],
  
  // Configuración necesaria para Railway
  output: 'standalone',
  
  // Configuración para permitir deploy con advertencias de ESLint
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Configuración de TypeScript
  typescript: {
    // Permitir build aunque haya errores de tipos (solo para desarrollo)
    // En producción debería estar en false
    ignoreBuildErrors: false,
  },
  
  // Environment variables configuration - Force injection for client
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  
  // Additional configuration for Railway deployment
  // NOTA: publicRuntimeConfig está deprecado pero puede ser necesario para compatibilidad
  publicRuntimeConfig: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  
  // Webpack configuration to ensure environment variables are available
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Force environment variables to be available on client-side
      config.plugins.push(
        new (require('webpack')).DefinePlugin({
          'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL),
          'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        })
      )
    }
    return config
  },
  
  // Configuración para rutas internas (no subdominios)
  async rewrites() {
    return [
      {
        source: '/favicon.ico',
        destination: '/brand/favicon-humano-sisu.png',
      },
      // Public descriptive slugs → internal page files
      {
        source: '/cerrar-planilla-en-paz',
        destination: '/info',
      },
      {
        source: '/cerrar-planilla-en-paz/m/:id',
        destination: '/info/m/:id',
      },
      {
        source: '/planilla-sin-domingos',
        destination: '/viernes',
      },
    ]
  },
  
  // Redirecciones para mantener compatibilidad
  async redirects() {
    return [
      // Redirigir attendance legacy dashboard a la ruta homologada
      {
        source: '/attendance/dashboard',
        destination: '/app/attendance/dashboard',
        permanent: false,
      },
      // Redirigir /landing a la página principal
      {
        source: '/landing',
        destination: '/',
        permanent: false,
      },
      // Redirigir rutas legacy del dashboard
      {
        source: '/dashboard',
        destination: '/app/dashboard',
        permanent: false,
      },
      // Redirigir rutas legacy de empleados
      {
        source: '/employees',
        destination: '/app/employees',
        permanent: false,
      },
      // Redirigir rutas legacy de nómina
      {
        source: '/payroll',
        destination: '/app/payroll',
        permanent: false,
      },
      // Redirigir rutas legacy de reportes
      {
        source: '/reports',
        destination: '/app/reports',
        permanent: false,
      },
      // Redirigir rutas legacy de configuración
      {
        source: '/settings',
        destination: '/app/settings',
        permanent: false,
      },
      // Redirigir rutas legacy de departamentos
      {
        source: '/departments',
        destination: '/app/departments',
        permanent: false,
      },
      // Redirigir login legacy
      {
        source: '/login',
        destination: '/app/login',
        permanent: false,
      },
      // Funnel TOFU: canonical /cerrar-planilla-en-paz (legacy /secreto, /info → 301)
      {
        source: '/secreto',
        destination: '/cerrar-planilla-en-paz',
        permanent: true,
      },
      {
        source: '/secreto/m/:id',
        destination: '/cerrar-planilla-en-paz/m/:id',
        permanent: true,
      },
      {
        source: '/info',
        destination: '/cerrar-planilla-en-paz',
        permanent: true,
      },
      {
        source: '/info/m/:id',
        destination: '/cerrar-planilla-en-paz/m/:id',
        permanent: true,
      },
      // Campaign: canonical /planilla-sin-domingos (legacy /viernes, /domingo → 301)
      {
        source: '/viernes',
        destination: '/planilla-sin-domingos',
        permanent: true,
      },
      {
        source: '/domingo',
        destination: '/planilla-sin-domingos',
        permanent: true,
      },
      // Legal: hyphenated privacy path
      {
        source: '/politicadeprivacidad',
        destination: '/politica-de-privacidad',
        permanent: true,
      },
      // Calculadoras deducciones: canónico calculadora-deducciones* (calcusisu* → 301)
      {
        source: '/calcusisuhn',
        destination: '/calculadora-deducciones',
        permanent: true,
      },
      {
        source: '/calcusisusv',
        destination: '/calculadora-deducciones-el-salvador',
        permanent: true,
      },
      {
        source: '/calcusisuguate',
        destination: '/calculadora-deducciones-guatemala',
        permanent: true,
      },
      // Redirigir attendance legacy - COMENTADO: ahora /attendance/register existe directamente
      // {
      //   source: '/attendance/register',
      //   destination: '/app/attendance/register',
      //   permanent: false,
      // },
    ]
  },
  
  // Add headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Frame protection
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // MIME sniffing protection
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Referrer policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // XSS protection (legacy)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // HTTPS enforcement
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // Content Security Policy - Basic but effective
          // Note: 'unsafe-inline' is needed for Schema.org JSON-LD scripts
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://connect.facebook.net; " +
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
              "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
              "img-src 'self' data: https:; " +
              "font-src 'self' data: https://fonts.gstatic.com; " +
              "connect-src 'self' https://*.supabase.co https://*.supabase.com https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://www.facebook.com https://connect.facebook.net; " +
              "frame-ancestors 'none';",
          },
          // Permissions policy (restricts browser features)
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
        ],
      },
      // Additional CSP for API routes
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'none'; frame-ancestors 'none';",
          },
        ],
      },
      // Sitemap should be accessible without restrictive headers
      {
        source: '/sitemap.xml',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/xml; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      // Static marketing assets — cache agresivo en CDN (patrones simples; regex compleja rompe build)
      {
        source: '/:path*.png',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/:path*.jpg',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/:path*.webp',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

module.exports = withBundleAnalyzer(nextConfig)
