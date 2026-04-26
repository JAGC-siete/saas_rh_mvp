import MailListSubscription from './MailListSubscription'

export default function MailListSection() {
  return (
    <section id="mail-list" className="py-12 sm:py-16 md:py-20 bg-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 px-2">
          Liderazgo, Productividad y Cultura Laboral para PyMEs
        </h2>
        <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
          Únete a nuestra lista de correos y recibe estrategias prácticas para optimizar el tiempo de tu equipo, mejorar el clima laboral y modernizar la gestión de tu empresa. Ideas accionables para líderes que quieren crecer con orden y transparencia.
        </p>
        <div className="max-w-md mx-auto">
          <MailListSubscription source="landing" />
        </div>
      </div>
    </section>
  )
}

