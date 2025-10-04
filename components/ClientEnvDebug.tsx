import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { AlertTriangle, CheckCircle, RefreshCw, Copy, Check } from 'lucide-react'

interface ClientEnvStatus {
  NEXT_PUBLIC_SUPABASE_URL: string | undefined
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string | undefined
  NODE_ENV: string | undefined
  loaded: boolean
  source: 'process.env' | 'api' | 'unknown'
}

export default function ClientEnvDebug() {
  const [envStatus, setEnvStatus] = useState<ClientEnvStatus>({
    NEXT_PUBLIC_SUPABASE_URL: undefined,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
    NODE_ENV: undefined,
    loaded: false,
    source: 'unknown'
  })
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    checkClientEnvironment()
  }, [])

  const checkClientEnvironment = async () => {
    try {
      setLoading(true)
      
      // Check process.env first
      const processEnv = {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        NODE_ENV: process.env.NODE_ENV,
      }

      if (processEnv.NEXT_PUBLIC_SUPABASE_URL && processEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setEnvStatus({
          ...processEnv,
          loaded: true,
          source: 'process.env'
        })
      } else {
        // Try to fetch from API
        const response = await fetch('/api/client-env')
        if (response.ok) {
          const apiEnv = await response.json()
          setEnvStatus({
            ...apiEnv,
            loaded: true,
            source: 'api'
          })
        } else {
          setEnvStatus({
            NEXT_PUBLIC_SUPABASE_URL: undefined,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
            NODE_ENV: undefined,
            loaded: false,
            source: 'unknown'
          })
        }
      }
    } catch (error) {
      console.error('Error checking client environment:', error)
      setEnvStatus({
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
        NODE_ENV: undefined,
        loaded: false,
        source: 'unknown'
      })
    } finally {
      setLoading(false)
    }
  }

  const copyDebugInfo = async () => {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: envStatus,
      userAgent: navigator.userAgent,
      location: window.location.href,
      processEnv: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
        NODE_ENV: process.env.NODE_ENV
      }
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy debug info:', error)
    }
  }

  const getStatusIcon = (value: string | undefined) => {
    return value ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-red-500" />
  }

  const getStatusText = (value: string | undefined) => {
    return value ? 'Set' : 'Missing'
  }

  const getStatusColor = (value: string | undefined) => {
    return value ? 'text-green-600' : 'text-red-600'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <AlertTriangle className="h-5 w-5" />
          Debug: Variables de Entorno del Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">NEXT_PUBLIC_SUPABASE_URL</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(envStatus.NEXT_PUBLIC_SUPABASE_URL)}
                <span className={`text-sm ${getStatusColor(envStatus.NEXT_PUBLIC_SUPABASE_URL)}`}>
                  {getStatusText(envStatus.NEXT_PUBLIC_SUPABASE_URL)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(envStatus.NEXT_PUBLIC_SUPABASE_ANON_KEY)}
                <span className={`text-sm ${getStatusColor(envStatus.NEXT_PUBLIC_SUPABASE_ANON_KEY)}`}>
                  {getStatusText(envStatus.NEXT_PUBLIC_SUPABASE_ANON_KEY)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">NODE_ENV</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-600">{envStatus.NODE_ENV || 'Unknown'}</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Fuente de Variables</span>
              <span className="text-sm text-blue-600">{envStatus.source}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estado de Carga</span>
              <div className="flex items-center gap-2">
                {envStatus.loaded ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-red-500" />}
                <span className={`text-sm ${envStatus.loaded ? 'text-green-600' : 'text-red-600'}`}>
                  {envStatus.loaded ? 'Cargado' : 'No cargado'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-100 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">Información de Debug:</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <div>• Si las variables están "Missing", el problema está en la configuración del cliente</div>
            <div>• Si la fuente es "process.env", Next.js está cargando las variables correctamente</div>
            <div>• Si la fuente es "api", el cliente está usando el endpoint de respaldo</div>
            <div>• Si la fuente es "unknown", hay un problema en la carga de variables</div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={checkClientEnvironment}
            variant="outline"
            size="sm"
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Verificar Nuevamente
          </Button>
          
          <Button 
            onClick={copyDebugInfo}
            variant="outline"
            size="sm"
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? 'Copiado' : 'Copiar Debug Info'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
