import { useState, useEffect } from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Clock, User, ArrowLeft } from 'lucide-react'
import AttendanceManager from './AttendanceManager'

// Lazy load CloudBackground only when needed
const CloudBackground = dynamic(() => import('./CloudBackground'), { ssr: false })

export interface AttendanceRegisterProps {
  variant: 'public' | 'app' | 'embedded'
  showBackground?: boolean
  showAdminLink?: boolean
  showHeader?: boolean
  className?: string
}

export default function AttendanceRegister({
  variant = 'public',
  showBackground = true,
  showAdminLink = true,
  showHeader = true,
  className = ''
}: AttendanceRegisterProps) {
  const [currentTime, setCurrentTime] = useState('')
  const [isClient, setIsClient] = useState(false)

  // Update time
  useEffect(() => {
    setIsClient(true)
    
    const timer = setInterval(() => {
      const now = new Date()
      const tegucigalpaTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Tegucigalpa"}))
      setCurrentTime(tegucigalpaTime.toLocaleTimeString('es-HN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }))
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])

  // Get page title based on variant
  const getPageTitle = () => {
    switch (variant) {
      case 'app': return 'Registro de Asistencia - Panel de Control'
      case 'embedded': return 'Registro de Asistencia'
      default: return 'Registro de Asistencia - Sistema HR'
    }
  }

  // Get page description based on variant
  const getPageDescription = () => {
    switch (variant) {
      case 'app': return 'Registro de entrada y salida desde el panel de control'
      case 'embedded': return 'Registro de asistencia integrado'
      default: return 'Registro de entrada y salida para empleados'
    }
  }

  // Render based on variant
  const renderContent = () => {
    if (variant === 'embedded') {
      return (
        <div className={`space-y-6 ${className}`}>
          {showHeader && (
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
                <Clock className="h-8 w-8 text-brand-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Registro de Asistencia
              </h2>
              <p className="text-gray-600">
                Sistema de entrada y salida
              </p>
              {isClient && (
                <div className="mt-3 text-lg font-mono text-gray-700">
                  {currentTime}
                </div>
              )}
            </div>
          )}
          
          <Card>
            <CardHeader className="text-center pb-4">
              <CardTitle className="flex items-center justify-center gap-2">
                <User className="h-5 w-5" />
                Marcar Asistencia
              </CardTitle>
              <CardDescription>
                Ingrese los últimos 5 dígitos de su DNI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AttendanceManager />
            </CardContent>
          </Card>
        </div>
      )
    }

    if (variant === 'app') {
      return (
        <div className={`flex items-center justify-center p-4 ${className}`}>
          <div className="relative w-full max-w-md space-y-8">
            {showHeader && (
              <div className="text-center">
                <div className="mx-auto h-20 w-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg">
                  <Clock className="h-10 w-10 text-brand-600" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Registro de Asistencia
                </h1>
                <p className="text-brand-200">
                  Sistema de entrada y salida
                </p>
                {isClient && (
                  <div className="mt-4 text-lg font-mono text-brand-300">
                    {currentTime}
                  </div>
                )}
              </div>
            )}

            <Card variant="glass">
              <CardHeader className="text-center pb-6">
                <CardTitle className="flex items-center justify-center gap-2 text-white">
                  <User className="h-5 w-5" />
                  Marcar Asistencia
                </CardTitle>
                <CardDescription className="text-brand-200/90">
                  Ingrese los últimos 5 dígitos de su DNI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AttendanceManager />
              </CardContent>
            </Card>

            {showAdminLink && (
              <div className="text-center">
                <p className="text-brand-200 text-sm mb-3">¿Eres administrador?</p>
                <Link 
                  href="/app/login" 
                  className="inline-flex items-center gap-2 text-brand-300 hover:text-white transition-colors text-sm font-medium"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Acceso Administrativo
                </Link>
              </div>
            )}
          </div>
        </div>
      )
    }

    // Default: public variant
    return (
      <div className={`min-h-screen bg-app flex items-center justify-center p-4 relative ${className}`}>
        {showBackground && <CloudBackground />}
        <div className="relative w-full max-w-md space-y-8 z-10">
          {showHeader && (
            <div className="text-center">
              <div className="mx-auto h-20 w-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg">
                <Clock className="h-10 w-10 text-brand-600" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Registro de Asistencia
              </h1>
              <p className="text-brand-200">
                Sistema de entrada y salida
              </p>
              {isClient && (
                <div className="mt-4 text-lg font-mono text-brand-300">
                  {currentTime}
                </div>
              )}
            </div>
          )}

          <Card variant="glass">
            <CardHeader className="text-center pb-6">
              <CardTitle className="flex items-center justify-center gap-2 text-white">
                <User className="h-5 w-5" />
                Marcar Asistencia
              </CardTitle>
              <CardDescription className="text-brand-200/90">
                Ingrese los últimos 5 dígitos de su DNI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AttendanceManager />
            </CardContent>
          </Card>

          {showAdminLink && (
            <div className="text-center">
              <p className="text-brand-200 text-sm mb-3">¿Eres administrador?</p>
              <Link 
                href="/app/login" 
                className="inline-flex items-center gap-2 text-brand-300 hover:text-white transition-colors text-sm font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                Acceso Administrativo
              </Link>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{getPageTitle()}</title>
        <meta name="description" content={getPageDescription()} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      {renderContent()}
    </>
  )
}
