import React, { useEffect, useMemo, useState } from "react";

export default function LandingHero() {
  // Countdown to next quincena (15 o último día del mes)
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000); // update cada minuto
    return () => clearInterval(t);
  }, []);

  const { daysLeft, nextPayday } = useMemo(() => {
    const d = new Date(now);
    const y = d.getFullYear();
    const m = d.getMonth(); // 0-11
    const day = d.getDate();

    // Definimos quincenas: 15 y último día del mes
    const fifteenth = new Date(y, m, 15, 23, 59, 59);
    const lastOfMonth = new Date(y, m + 1, 0, 23, 59, 59); // 0 => último día del mes anterior

    const target = day <= 15 ? fifteenth : lastOfMonth;
    const diffMs = target.getTime() - d.getTime();
    const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    return { daysLeft: diffDays, nextPayday: target };
  }, [now]);

  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    contact: '',
    employees: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Log para analytics
    console.info('Form submitted:', formData);
    
    try {
      // Navegación simple a /activar con query params
      const params = new URLSearchParams({
        name: formData.name,
        company: formData.company,
        contact: formData.contact,
        employees: formData.employees
      });
      
      window.location.href = `/activar?${params.toString()}`;
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="relative isolate overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="glass-strong rounded-3xl p-8 lg:p-12 backdrop-blur-sm border border-white/20 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Copy */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-sm bg-white/10 backdrop-blur-sm shadow-sm">
                <span className="font-semibold text-white">⏱️ Faltan {daysLeft} días</span>
                <span className="text-brand-200/80">para tu próxima quincena</span>
              </div>

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

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <button
                  onClick={() => setOpenForm((v) => !v)}
                  className="inline-flex items-center justify-center rounded-2xl px-6 py-3 text-base font-semibold shadow-sm bg-sky-600 text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  data-analytics="cta_hero_click"
                >
                  🎯 Activar mi robot RH hoy
                </button>
                <span className="text-sm text-brand-200/70">Demo gratis en 10 minutos. Sin tarjeta.</span>
              </div>

              {openForm && (
                <form onSubmit={handleSubmit} className="mt-4 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-4 shadow-sm space-y-3 max-w-lg" data-form="hero-demo">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input 
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="border border-white/20 rounded-xl px-3 py-2 bg-white/10 backdrop-blur-sm text-white placeholder-brand-200/50" 
                      placeholder="Nombre" 
                      required
                    />
                    <input 
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      className="border border-white/20 rounded-xl px-3 py-2 bg-white/10 backdrop-blur-sm text-white placeholder-brand-200/50" 
                      placeholder="Empresa" 
                      required
                    />
                    <input 
                      name="contact"
                      value={formData.contact}
                      onChange={handleInputChange}
                      className="border border-white/20 rounded-xl px-3 py-2 sm:col-span-2 bg-white/10 backdrop-blur-sm text-white placeholder-brand-200/50" 
                      placeholder="Correo o WhatsApp" 
                      required
                    />
                    <input 
                      name="employees"
                      value={formData.employees}
                      onChange={handleInputChange}
                      className="border border-white/20 rounded-xl px-3 py-2 sm:col-span-2 bg-white/10 backdrop-blur-sm text-white placeholder-brand-200/50" 
                      placeholder="# de empleados" 
                      required
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full rounded-xl bg-gray-900 text-white py-2.5 font-semibold hover:bg-black"
                    data-analytics="form_submit_demo"
                  >
                    Crear mi demo
                  </button>
                  <p className="text-xs text-brand-200/70">No pedimos tarjeta. Solo datos para cargar tu demo.</p>
                </form>
              )}

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
                      "Antes tardaba 6 horas cada quincena. Ahora son 15 minutos y cero reclamos el día de pago."
                    </p>
                    <div className="mt-2 text-sm text-gray-600">— Gerente de RRHH</div>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-xs text-brand-200/70 text-center">
                Próxima quincena: {nextPayday.toLocaleDateString()}. ¿Vas a seguir peleándote con Excel?
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
