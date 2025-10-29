import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { User, ArrowLeft, Shield } from 'lucide-react'
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
        <title>Registro de Asistencia | Sistema Hondureño de Recursos Humanos</title>
        <meta name="description" content="Plataforma de entrada y salida desarrollada en Honduras para empresas hondureñas" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{
        background: 'linear-gradient(180deg, #003366 0%, #01294d 100%)'
      }}>
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-20 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative w-full max-w-2xl space-y-8 z-10">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto w-24 h-24 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-2xl transform transition-transform hover:scale-105" style={{
              background: 'linear-gradient(135deg, #004C97 0%, #0072CE 100%)'
            }}>
              <Shield className="h-12 w-12 text-white" strokeWidth={2.5} />
            </div>
            
            <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
              Sistema Hondureño
            </h1>
            <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">
              de Recursos Humanos
            </h2>
            
            <p className="text-brand-100 text-lg font-medium mb-4">
              Registro Inteligente de Asistencia
            </p>
            
            {/* Time Display */}
            <div className="mt-6 text-3xl font-mono font-bold text-white" style={{
              textShadow: '0 2px 10px rgba(0,0,0,0.3)'
            }}>
              {currentTime}
            </div>
            
            <p className="text-sm text-blue-200 mt-4 font-medium">
              Cumple con IHSS, RAP, STSS — Hecho en Honduras 🇭🇳
            </p>
          </div>

          {/* Main Card with Glassmorphism */}
          <div style={{
            backdropFilter: 'blur(20px)',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '24px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.05)'
          }} className="p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-3">
                <User className="h-7 w-7" strokeWidth={2.5} />
                Marcar Asistencia
              </h3>
              <p className="text-blue-100 text-base font-medium">
                Ingrese su DNI completo o últimos 5 dígitos
              </p>
            </div>

            <AttendanceManager />

            {/* Footer with Admin Access */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-blue-100 text-sm mb-4 text-center">¿Eres administrador?</p>
              <Link 
                href="/app/login" 
                className="inline-flex items-center gap-2 text-white hover:text-blue-200 transition-colors text-sm font-semibold mx-auto block w-fit px-4 py-2 rounded-lg hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
                Acceso Administrativo
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-blue-100 text-xs font-medium">
              © 2025 Sistema Hondureño de Recursos Humanos
            </p>
            <p className="text-blue-200/80 text-xs mt-1">
              Desarrollado por Humano SISU
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
