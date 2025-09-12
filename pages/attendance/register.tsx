import { useState, useEffect } from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'
const CloudBackground = dynamic(() => import('../../components/CloudBackground'), { ssr: false })
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Clock, User, ArrowLeft } from 'lucide-react'
import AttendanceManager from '../../components/AttendanceManager'

export default function AttendanceRegisterPage() {
  const [currentTime, setCurrentTime] = useState('')

  // Update time
  useEffect(() => {
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

  return (
    <>
      <Head>
        <title>Registro de Asistencia - Sistema HR</title>
        <meta name="description" content="Registro de entrada y salida para empleados" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-app flex items-center justify-center p-4 relative">
        <CloudBackground />
        <div className="relative w-full max-w-md space-y-8 z-10">
          {/* Header */}
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
            <div className="mt-4 text-lg font-mono text-brand-300">
              {currentTime}
            </div>
          </div>

          {/* Attendance Form */}
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

          {/* Admin Access Link */}
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
        </div>
      </div>
    </>
  )
}
