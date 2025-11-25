import Link from 'next/link'
import { Button } from './ui/button'

export default function AffiliateProgramSection() {
  return (
    <section className="py-12 bg-gray-800">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          Gana Dinero con Humano SISU
        </h2>
        <p className="text-lg text-gray-300 mb-6 max-w-2xl mx-auto">
          ¿Conoces empresas que podrían beneficiarse de nuestra plataforma? Únete a nuestro programa de afiliados y obtén comisiones por cada cliente que refieras.
        </p>
        <Button asChild>
          <Link href="/afiliados">Conocer Más</Link>
        </Button>
      </div>
    </section>
  )
}
