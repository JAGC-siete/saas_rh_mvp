import Head from 'next/head'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { ArrowRight, Briefcase, Clock } from 'lucide-react'

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-brand-900 to-indigo-900 flex items-center justify-center p-4">
      <Head>
        <title>Request a Demo - HUMANO SISU</title>
        <meta
          name="description"
          content="Solicita una demostración de Los Robots de Humano SISU"
        />
      </Head>

      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg">
            <Briefcase className="h-10 w-10 text-brand-600" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Los Robots de Humano SISU
          </h1>
          <p className="text-xl text-brand-400 font-medium mb-2">
            Tus nuevos asistentes de RRHH
          </p>
          <p className="text-brand-200 text-sm">
            Adiós al Excel. Hola a la eficiencia.
          </p>
        </div>

        <Card variant="glass">
          <CardHeader className="text-center pb-6">
            <CardTitle className="flex items-center justify-center gap-2 text-white">
              <Clock className="h-5 w-5" />
              Solicitar Demo
            </CardTitle>
            <CardDescription className="text-brand-200/90">
              Descubre cómo automatizar tu RH
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link
              href="/app/login"
              className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 px-4 rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2"
            >
              Automatiza tu RH Ahora
              <ArrowRight className="w-4 h-4" />
            </Link>
            
            <Link
              href="/"
              className="w-full glass text-brand-200 hover:text-white py-3 px-4 rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2 border border-brand-600/30 hover:border-brand-500"
            >
              Volver al Inicio
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
