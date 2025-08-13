import Head from 'next/head'
import Link from 'next/link'
import { Button } from '../components/ui/button'
import ServicesSection from '../components/ServicesSection'

export default function LandingPage() {
  return (
    <div className="landing min-h-screen bg-[var(--bg-hero)] text-gray-800 dark:text-gray-100">
      <Head>
        <title>Humano SISU - Landing</title>
        <meta
          name="description"
          content="Convierte tu CV en un imán para reclutadores"
        />
      </Head>

      {/* Hero Section */}
      <section className="landing-section text-center bg-white/30 dark:bg-gray-900/30 backdrop-blur-md">
        <h1 className="text-4xl font-bold mb-4">
          Convierte tu CV en un imán para reclutadores
        </h1>
        <p className="mb-8 text-lg">
          Ahorra 35 h/mes y elimina 95 % de errores en RR.HH.
        </p>
        <Button asChild className="h-12 px-6">
          <Link href="/login" aria-label="Comenzar">
            Comenzar
          </Link>
        </Button>
      </section>

      {/* Services Section (rediseño) */}
      <ServicesSection />
    </div>
  )
}

