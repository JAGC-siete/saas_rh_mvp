# Configuración Funcional (Working Configuration)

## Commit Problemático Identificado

**Commit `5a1bbf74`** (Sun Nov 30 17:04:03 2025)
- **Mensaje**: `feat: Integrar proxy Hikvision como API routes de Next.js`
- **Problema**: Eliminó `publicRuntimeConfig` y agregó `outputFileTracingExcludes` que puede estar causando problemas con el build standalone

## Configuración Funcional (Antes del commit 5a1bbf74)

### next.config.js - Versión Funcional

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Configuración necesaria para Railway
  output: 'standalone',
  
  // Configuración para permitir deploy con advertencias de ESLint
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Environment variables configuration - Force injection for client
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  
  // Additional configuration for Railway deployment
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
      // Rewrite /favicon.ico to logo to prevent 502 errors
      {
        source: '/favicon.ico',
        destination: '/logo-humano-sisu.png',
      },
    ]
  },
  
  // ... resto de redirects y headers
}
```

## Cambios Problemáticos en commit 5a1bbf74

1. **Eliminó `publicRuntimeConfig`** - Aunque está deprecado, podría haber sido necesario para el funcionamiento
2. **Agregó `outputFileTracingExcludes`** - Puede estar excluyendo archivos necesarios del build standalone
3. **Agregó `typescript.ignoreBuildErrors`** - Cambio en la configuración de TypeScript
4. **Agregó `watchOptions` en webpack** - Cambio en la configuración de webpack

## Solución: Restaurar Configuración Funcional

Restaurar la configuración anterior pero manteniendo:
- El rewrite del favicon (agregado en 6a7c63e6)
- El manejo de errores mejorado (agregado en f706b6a8)

## Commits Relevantes

- **876eec00~1**: Última versión funcional antes de los cambios problemáticos
- **5a1bbf74**: Commit problemático que introdujo los cambios
- **6a7c63e6**: Fix del favicon (debe mantenerse)
- **f706b6a8**: Mejoras de manejo de errores (debe mantenerse)

