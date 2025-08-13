import { useMemo, useState } from 'react'

const btnPrimary =
  "inline-flex items-center justify-center h-11 px-5 rounded-xl bg-brand-600 text-white font-semibold shadow-lg shadow-black/20 " +
  "transition-transform duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 focus:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-brand-400"

export default function ActivarPage() {
  const [step, setStep] = useState<number>(1)
  const [seats, setSeats] = useState<number>(25)
  const [addons, setAddons] = useState<{ asistencia: boolean; nomina: boolean; reclutamiento: boolean }>({
    asistencia: true,
    nomina: true,
    reclutamiento: false,
  })

  const basePricePerSeat = 120 // Lempiras por empleado/mes (ejemplo)
  const addonPrices = {
    asistencia: 15,
    nomina: 25,
    reclutamiento: 30,
  }

  const totalAddonsPerSeat = useMemo(() => {
    let sum = 0
    if (addons.asistencia) sum += addonPrices.asistencia
    if (addons.nomina) sum += addonPrices.nomina
    if (addons.reclutamiento) sum += addonPrices.reclutamiento
    return sum
  }, [addons])

  const calculateTotal = useMemo(() => {
    const perSeat = basePricePerSeat + totalAddonsPerSeat
    return perSeat * seats
  }, [seats, totalAddonsPerSeat])

  return (
    <main className="min-h-screen text-gray-100 bg-slate-950">
      <section className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Activar Humano SISU</h1>
        <p className="text-brand-200/90 mb-6">Completa los pasos para iniciar. Podrás ajustar asientos y módulos.</p>

        {/* Stepper simple */}
        <div className="mb-6 flex items-center gap-3">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-2 rounded-full ${step >= s ? 'bg-brand-500' : 'bg-white/10'} ${s < 3 ? 'w-24' : 'w-10'}`} />
          ))}
        </div>

        {/* Contenido por paso (simplificado) */}
        <div className="glass border border-white/10 rounded-2xl p-5 space-y-4">
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-2">Paso 1: Asientos</h2>
              <p className="text-brand-200/90 mb-4">Define la cantidad de colaboradores.</p>
              <input
                type="range"
                min={5}
                max={500}
                value={seats}
                onChange={(e) => setSeats(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="mt-2 text-brand-200">Asientos: <span className="text-white font-semibold">{seats}</span></div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold mb-2">Paso 2: Módulos</h2>
              <p className="text-brand-200/90 mb-4">Activa los módulos que necesitas.</p>
              <div className="grid sm:grid-cols-3 gap-3">
                <label className="glass border border-white/10 rounded-xl p-3 flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={addons.asistencia} onChange={(e) => setAddons(a => ({ ...a, asistencia: e.target.checked }))} />
                  <span>Asistencia (+L{addonPrices.asistencia}/empleado)</span>
                </label>
                <label className="glass border border-white/10 rounded-xl p-3 flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={addons.nomina} onChange={(e) => setAddons(a => ({ ...a, nomina: e.target.checked }))} />
                  <span>Nómina (+L{addonPrices.nomina}/empleado)</span>
                </label>
                <label className="glass border border-white/10 rounded-xl p-3 flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={addons.reclutamiento} onChange={(e) => setAddons(a => ({ ...a, reclutamiento: e.target.checked }))} />
                  <span>Reclutamiento (+L{addonPrices.reclutamiento}/empleado)</span>
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold mb-2">Paso 3: Revisión</h2>
              <p className="text-brand-200/90">Revisa tu selección y continúa para activar.</p>
              <ul className="mt-3 text-brand-200 list-disc list-inside">
                <li>Asientos: {seats}</li>
                <li>Precio por asiento: L{(basePricePerSeat + totalAddonsPerSeat).toLocaleString()}</li>
                <li>Total mensual estimado: L{calculateTotal.toLocaleString()}</li>
              </ul>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="px-4 h-11 rounded-xl border border-white/15 text-brand-200 hover:text-white hover:border-brand-400/40"
            >
              Atrás
            </button>
            <button
              onClick={() => setStep((s) => Math.min(3, s + 1))}
              className={btnPrimary}
            >
              {step < 3 ? 'Continuar' : 'Activar ahora'}
            </button>
          </div>
        </div>
      </section>

      {/* Sticky mobile summary */}
      <div className="fixed inset-x-0 bottom-0 z-40 glass border-t border-white/10 p-3 sm:hidden backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <span className="text-brand-200">Total</span>
          <span className="text-white font-bold text-lg">L{calculateTotal.toLocaleString()}</span>
          <button onClick={() => setStep((s) => Math.min(3, s + 1))} className={btnPrimary}>Continuar</button>
        </div>
      </div>
    </main>
  )
}