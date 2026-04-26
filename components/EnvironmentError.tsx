import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { AlertTriangle, RefreshCw, ExternalLink, Copy, Check } from 'lucide-react'

interface EnvStatus {
  NODE_ENV?: string
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  RAILWAY_ENVIRONMENT?: string
  PORT?: string
  hasSupabaseUrl: boolean
  hasSupabaseAnonKey: boolean
  hasServiceRoleKey: boolean
}

export default function EnvironmentError() {
  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
  const [diagnosticsBlocked, setDiagnosticsBlocked] = useState(false)

  useEffect(() => {
    checkEnvironment()
  }, [])

  const checkEnvironment = async () => {
    try {
      setLoading(true)
      setDiagnosticsBlocked(false)
      const response = await fetch('/api/env-check')
      if (response.status === 404) {
        setDiagnosticsBlocked(true)
        setEnvStatus(null)
        return
      }
      const data = await response.json()
      setEnvStatus(data.environment)
    } catch (error) {
      console.error('Error checking environment:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const getRailwaySetupCommands = () => {
    return `# Configurar variables de entorno en Railway
railway variables --set "NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase"
railway variables --set "NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima"
railway variables --set "SUPABASE_SERVICE_ROLE_KEY=tu_clave_service_role"

# Verificar configuración
railway variables`
  }

  const getVercelSetupCommands = () => {
    return `# Configurar variables de entorno en Vercel
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Redesplegar después de agregar variables
vercel --prod`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (diagnosticsBlocked) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center gap-2 text-amber-900">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Verificación automática no disponible</span>
          </div>
          <p className="text-sm text-amber-900/90">
            En producción el endpoint de diagnóstico está desactivado. Revise en el panel de su proveedor
            (Railway, Vercel, etc.) que existan{' '}
            <code className="text-xs bg-amber-100/80 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code>,{' '}
            <code className="text-xs bg-amber-100/80 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> y{' '}
            <code className="text-xs bg-amber-100/80 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code>.
            Para habilitar temporalmente la comprobación vía API, defina{' '}
            <code className="text-xs bg-amber-100/80 px-1 rounded">ENABLE_SERVER_DIAGNOSTICS=true</code> en el
            servidor (solo el tiempo necesario para diagnosticar).
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!envStatus) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            <span>Error al verificar configuración del entorno</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const missingVars = [
    ...(!envStatus.hasSupabaseUrl ? ['NEXT_PUBLIC_SUPABASE_URL'] : []),
    ...(!envStatus.hasSupabaseAnonKey ? ['NEXT_PUBLIC_SUPABASE_ANON_KEY'] : []),
    ...(!envStatus.hasServiceRoleKey ? ['SUPABASE_SERVICE_ROLE_KEY'] : [])
  ]

  return (
    <div className="space-y-6">
      {/* Error Header */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-6 w-6" />
            Variables de Entorno Faltantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-red-700">
            El dashboard no puede cargar porque faltan las siguientes variables de entorno en producción:
          </p>
          
          <div className="bg-red-100 p-4 rounded-lg">
            <h4 className="font-semibold text-red-800 mb-2">Variables Faltantes:</h4>
            <ul className="list-disc list-inside space-y-1 text-red-700">
              {missingVars.map((varName) => (
                <li key={varName} className="font-mono text-sm">{varName}</li>
              ))}
            </ul>
          </div>

          <Button 
            onClick={checkEnvironment}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Verificar Nuevamente
          </Button>
        </CardContent>
      </Card>

      {/* Environment Status */}
      <Card>
        <CardHeader>
          <CardTitle>Estado del Entorno</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">NEXT_PUBLIC_SUPABASE_URL</span>
                <span className={`text-sm ${envStatus.hasSupabaseUrl ? 'text-green-600' : 'text-red-600'}`}>
                  {envStatus.NEXT_PUBLIC_SUPABASE_URL}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
                <span className={`text-sm ${envStatus.hasSupabaseAnonKey ? 'text-green-600' : 'text-red-600'}`}>
                  {envStatus.NEXT_PUBLIC_SUPABASE_ANON_KEY}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">SUPABASE_SERVICE_ROLE_KEY</span>
                <span className={`text-sm ${envStatus.hasServiceRoleKey ? 'text-green-600' : 'text-red-600'}`}>
                  {envStatus.SUPABASE_SERVICE_ROLE_KEY}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">NODE_ENV</span>
                <span className="text-sm text-blue-600">{envStatus.NODE_ENV || 'Not set'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">RAILWAY_ENVIRONMENT</span>
                <span className="text-sm text-blue-600">{envStatus.RAILWAY_ENVIRONMENT}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instrucciones de Configuración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Railway Setup */}
          <div>
            <h4 className="font-semibold mb-2">Para Railway:</h4>
            <div className="bg-gray-100 p-4 rounded-lg relative">
              <pre className="text-sm overflow-x-auto">{getRailwaySetupCommands()}</pre>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(getRailwaySetupCommands(), 'railway')}
                className="absolute top-2 right-2"
              >
                {copied === 'railway' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Vercel Setup */}
          <div>
            <h4 className="font-semibold mb-2">Para Vercel:</h4>
            <div className="bg-gray-100 p-4 rounded-lg relative">
              <pre className="text-sm overflow-x-auto">{getVercelSetupCommands()}</pre>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(getVercelSetupCommands(), 'vercel')}
                className="absolute top-2 right-2"
              >
                {copied === 'vercel' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Documentation Links */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => window.open('https://docs.railway.app/develop/variables', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Railway Docs
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open('https://vercel.com/docs/concepts/projects/environment-variables', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Vercel Docs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
