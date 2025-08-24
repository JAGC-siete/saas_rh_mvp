/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Configuración necesaria para Railway
  output: 'standalone',
  
  // Configuración para permitir deploy con advertencias de ESLint
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Environment variables configuration
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  
  // Configuración para rutas internas (no subdominios)
  async rewrites() {
    return [
      // No necesitamos rewrites para rutas internas
      // Las rutas /app/* funcionan directamente
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
    ]
  },
}

module.exports = nextConfig
