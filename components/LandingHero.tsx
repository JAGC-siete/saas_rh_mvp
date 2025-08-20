import React from "react";

export default function LandingHero() {
  // Función simple para obtener la próxima quincena
  const getNextPayday = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const day = now.getDate();
    
    const fifteenth = new Date(y, m, 15, 23, 59, 59);
    const lastOfMonth = new Date(y, m + 1, 0, 23, 59, 59);
    
    return day <= 15 ? fifteenth : lastOfMonth;
  };

  const nextPayday = getNextPayday();

  return (
    <div className="relative isolate overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="glass-strong rounded-3xl p-8 lg:p-12 backdrop-blur-sm border border-white/20 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Copy */}
            <div className="space-y-6">


              <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-white">
                ¿Otra quincena corriendo detrás de la planilla?
                <span className="block text-brand-300">Activá tu robot de RH y olvidate de las carreras.</span>
              </h1>

              <p className="text-lg text-brand-200/90">
                Generá planilla en 5 minutos, con IHSS, RAP e ISR listos y vouchers enviados por Mail/WhatsApp.
              </p>

              <ul className="text-brand-200/80 space-y-2">
                <li className="flex items-start gap-2"><span>✅</span> Cumplimiento STSS desde el día uno.</li>
                <li className="flex items-start gap-2"><span>✅</span> De Excel caótico a PDF impecable en minutos.</li>
                <li className="flex items-start gap-2"><span>✅</span> Ahorro de 6 horas por quincena.</li>
              </ul>

              <div className="flex justify-center">
                <button
                  onClick={() => window.location.href = '/activar'}
                  className="inline-flex items-center justify-center rounded-2xl px-8 py-4 text-lg font-semibold shadow-sm bg-sky-600 text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all duration-300 hover:-translate-y-1"
                  data-analytics="cta_hero_click"
                >
                  🎯 Activar mi robot RH hoy
                </button>
              </div>



              <div className="flex flex-wrap items-center gap-4 text-sm text-brand-200/80">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1 border border-white/20">
                  <span>🧾 Vouchers por WhatsApp</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1 border border-white/20">
                  <span>🧮 IHSS • RAP • ISR</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1 border border-white/20">
                  <span>🛡️ Cumple con STSS</span>
                </div>
              </div>
            </div>

            {/* Proof */}
            <div className="relative">
              <div className="rounded-3xl border bg-white/80 backdrop-blur shadow-xl p-4" data-proof="voucher-screenshot">
                <div className="aspect-[4/3] w-full rounded-2xl bg-white border flex items-center justify-center overflow-hidden">
                  {/* Placeholder para screenshot del voucher */}
                  <img 
                    src="/voucher-sample.png" 
                    alt="Voucher de pago (ejemplo)" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback si no existe la imagen
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden text-center p-6 text-gray-400">
                    <div className="text-sm font-semibold text-gray-600 mb-2">Colocá aquí tu voucher real</div>
                    <div className="text-xs text-gray-500">La prueba mata el speech: subí un PNG/JPG del PDF de pago real (datos sensibles ocultos).</div>
                  </div>
                </div>

                {/* Testimonio */}
                <div className="mt-4">
                  <div className="rounded-2xl border bg-white p-4">
                    <p className="text-gray-800 italic">
                      &ldquo;Antes tardaba 6 horas cada quincena. Ahora son 15 minutos y cero reclamos el día de pago.&rdquo;
                    </p>
                    <div className="mt-2 text-sm text-gray-600">— Gerente de RRHH </div>
                  </div>
                </div>
              </div>


            </div>
          </div>
          
          {/* Frase de urgencia al final del componente */}
          <div className="text-center mt-12">
            <p className="text-xl font-semibold text-brand-200/90">
              Próxima quincena: {nextPayday.toLocaleDateString()}. ¿Vas a seguir peleándote con Excel?
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
