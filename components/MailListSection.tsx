import MailListSubscription from './MailListSubscription'

export default function MailListSection() {
  return (
    <section id="mail-list" className="relative py-16 sm:py-20 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-brand-500/10 blur-[120px] -z-10 pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-strong p-8 md:p-12 rounded-3xl border border-white/10 text-center max-w-3xl mx-auto shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
            Liderazgo, Productividad y Cultura Laboral para PyMEs
          </h2>
          <p className="text-base sm:text-lg text-brand-200/90 mb-8 max-w-xl mx-auto font-medium">
            Únete a nuestra lista de correos y recibe estrategias prácticas para optimizar el tiempo de tu equipo, mejorar el clima laboral y modernizar la gestión de tu empresa.
          </p>
          <MailListSubscription source="landing" />
        </div>
      </div>
    </section>
  )
}
