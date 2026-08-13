import MailListSubscription from './MailListSubscription'
import ScrollReveal from './landing/ScrollReveal'

export default function MailListSection() {
  return (
    <section id="mail-list" className="relative py-16 sm:py-20 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-brand-500/10 blur-[120px] -z-10 pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="glass-modern p-8 md:p-12 rounded-3xl text-center max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
              Liderazgo, Productividad y Cultura Laboral
            </h2>
            <p className="text-base sm:text-lg text-slate-400 mb-8 max-w-xl mx-auto font-medium">
              Únete a +500 gerentes en Centroamérica que reciben consejos prácticos para PyMEs.
            </p>
            <MailListSubscription source="landing" />
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
