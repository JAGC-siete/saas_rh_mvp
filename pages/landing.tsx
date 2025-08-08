import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { Moon, Sun, Fingerprint, Calculator, BarChart3 } from 'lucide-react'

export default function LandingPage() {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    document.body.classList.add('landing')
    return () => {
      document.body.classList.remove('landing')
    }
  }, [])

  return (
    <div className={darkMode ? 'dark' : ''}>
      <Head>
        <title>Humano SISU - Optimiza RR.HH.</title>
        <meta name="description" content="Convierte tu CV en un imán para reclutadores" />
      </Head>

      <header className="sticky top-0 z-50 glass">
        <nav className="container mx-auto flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold text-[var(--primary)]">Humano SISU</h1>
          <button
            aria-label="Cambiar a modo oscuro"
            onClick={() => setDarkMode(!darkMode)}
            className="btn-secondary rounded-full p-2 flex items-center justify-center"
          >
            {darkMode ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
          </button>
        </nav>
      </header>

      <main>
        <section className="min-h-screen flex flex-col items-center justify-center text-center px-4 glass">
          <h1 className="text-4xl font-extrabold mb-4 text-gray-900 dark:text-gray-100">
            Convierte tu CV en un imán para reclutadores
          </h1>
          <p className="mb-8 text-lg text-gray-700 dark:text-gray-300">
            Ahorra 35 h/mes y elimina 95 % de errores en RR.HH.
          </p>
          <div className="flex gap-4">
            <Link href="/login" className="btn-primary" aria-label="Comenzar ahora">
              Comenzar
            </Link>
            <Link href="#servicios" className="btn-secondary" aria-label="Ver servicios">
              Ver servicios
            </Link>
          </div>
        </section>

        <section id="servicios" className="py-20 container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">Nuestros Servicios</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="glass p-6 rounded-lg text-center">
              <Fingerprint className="w-12 h-12 mx-auto mb-4 text-[var(--primary)]" aria-hidden="true" />
              <h3 className="text-xl font-semibold mb-2">Asistencia Inteligente</h3>
              <p className="text-sm">
                Registro por DNI (5 dígitos) + detección de llegadas tarde → 95 % menos errores
              </p>
            </div>
            <div className="glass p-6 rounded-lg text-center">
              <Calculator className="w-12 h-12 mx-auto mb-4 text-[var(--primary)]" aria-hidden="true" />
              <h3 className="text-xl font-semibold mb-2">Planilla Automática</h3>
              <p className="text-sm">
                Cálculo con IHSS, RAP e ISR incluidos → 80 % menos tiempo y PDF listos para firma
              </p>
            </div>
            <div className="glass p-6 rounded-lg text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-[var(--primary)]" aria-hidden="true" />
              <h3 className="text-xl font-semibold mb-2">Analytics en Tiempo Real</h3>
              <p className="text-sm">
                Dashboard con métricas de puntualidad, costo de nómina y reportes exportables
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="text-center py-8 text-sm glass">
        © 2025 Humano SISU. Todos los derechos reservados.
      </footer>
    </div>
  )
}
