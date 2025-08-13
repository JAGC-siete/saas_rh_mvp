import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Clock, User, AlertCircle, ArrowLeft } from 'lucide-react'
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

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMxZTI5M2IiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSI0Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        
        <div className="relative w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-20 w-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg">
              <Clock className="h-10 w-10 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Registro de Asistencia
            </h1>
            <p className="text-blue-200">
              Sistema de entrada y salida
            </p>
            <div className="mt-4 text-lg font-mono text-blue-300">
              {currentTime}
            </div>
          </div>

          {/* Attendance Form */}
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="text-center pb-6">
              <CardTitle className="flex items-center justify-center gap-2 text-gray-800">
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

          {/* Admin Access Link */}
          <div className="text-center">
            <p className="text-blue-200 text-sm mb-3">¿Eres administrador?</p>
            <Link 
              href="/login" 
              className="inline-flex items-center gap-2 underline decoration-white/20 underline-offset-4 hover:decoration-brand-400 transition text-blue-300 hover:text-white text-sm font-medium"
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