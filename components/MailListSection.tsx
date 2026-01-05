import MailListSubscription from './MailListSubscription'

export default function MailListSection() {
  return (
    <section id="mail-list" className="py-12 sm:py-16 md:py-20 bg-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 px-2">
          Una subscripción de correo sobre religión politica y fútbol
        </h2>
        <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
          Ideas de cambio para cambiar el entorno inmediato, reducir el ruido y tomar control del espacio propio desempeño sin esperar mejores pastores, politicos o presidentes. Exclusivo para personas que estudian y/o trabajan
        </p>
        <div className="max-w-md mx-auto">
          <MailListSubscription source="landing" />
        </div>
      </div>
    </section>
  )
}

