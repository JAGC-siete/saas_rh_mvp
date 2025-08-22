// Middleware Configuration
export const MIDDLEWARE_CONFIG = {
  // Security settings
  security: {
    // Rate limiting (requests per minute per IP)
    rateLimit: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100, // max 100 requests per minute
    },
    
    // CORS settings
    cors: {
      allowedOrigins: [
        'https://humanosisu.net',
        'https://humano-sisu.com',
        'https://staging.humanosisu.net',
        'http://localhost:3000' // Development only
      ],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'x-nextjs-data',
        'x-requested-with'
      ],
      allowCredentials: true
    },
    
    // Headers for security
    securityHeaders: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    }
  },
  
  // Logging configuration
  logging: {
    // Log levels for different types of requests
    levels: {
      public: 'debug',
      authenticated: 'info',
      admin: 'debug',
      api: 'debug',
      error: 'error'
    },
    
    // Sensitive fields to redact from logs
    sensitiveFields: [
      'password',
      'token',
      'secret',
      'key',
      'authorization'
    ]
  },
  
  // Route protection levels
  protection: {
    // Public routes (no auth required)
    public: [
      '/',
      '/demo',
      '/activar',
      '/gracias',
      '/pricing',
      '/features',
      '/about',
      '/trial-dashboard',
      '/politicadeprivacidad'
    ],
    
    // Demo routes (PIN required)
    demo: [
      '/app/demo',
      '/api/demo'
    ],
    
    // Authenticated routes (login required)
    authenticated: [
      '/app/dashboard',
      '/app/employees',
      '/app/payroll',
      '/app/reports',
      '/app/settings',
      '/app/departments',
      '/app/leave',
      '/app/gamification',
      '/app/profile',
      '/app/notifications'
    ],
    
    // Admin routes (admin role required)
    admin: [
      '/app/admin',
      '/api/admin'
    ]
  },
  
  // AWS Certification assets
  awsAssets: [
    '/icons/aws-solutions-architect.svg',
    '/icons/aws-developer.svg',
    '/icons/aws-cloud-practitioner.svg',
    '/image-aws-solutions-architect.png',
    '/image-aws-developer.png',
    '/image-aws-cloud-practitioner.png'
  ],
  
  // Static assets that should be publicly accessible
  staticAssets: [
    '/voucher-sample.png',
    '/logo-humano-sisu.png',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml'
  ]
}

// Helper function to get all public assets
export function getAllPublicAssets(): string[] {
  return [
    ...MIDDLEWARE_CONFIG.awsAssets,
    ...MIDDLEWARE_CONFIG.staticAssets
  ]
}

// Helper function to get all public routes
export function getAllPublicRoutes(): string[] {
  return [
    ...MIDDLEWARE_CONFIG.protection.public,
    ...MIDDLEWARE_CONFIG.protection.demo.map(route => route + '/*'),
    '/app/login',
    '/app/demo/pin',
    '/app/attendance/register',
    '/registrodeasistencia',
    '/attendance/public',
    '/attendance/register',
    '/api/attendance/lookup',
    '/api/attendance/register',
    '/api/attendance/first-time-check',
    '/api/attendance/update-schedule',
    '/api/activar',
    '/api/demo/verify-pin',
    '/api/health',
    '/api/cron/*'
  ]
}

// Helper function to get all protected routes
export function getAllProtectedRoutes(): string[] {
  return [
    ...MIDDLEWARE_CONFIG.protection.authenticated,
    ...MIDDLEWARE_CONFIG.protection.admin
  ]
}

// Helper function to get all admin routes
export function getAllAdminRoutes(): string[] {
  return MIDDLEWARE_CONFIG.protection.admin
}
