import React, { useEffect, useMemo, useState } from "react";

export default function CountdownTimer() {
  // Countdown to next quincena (15 o último día del mes)
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000); // update cada segundo
    return () => clearInterval(t);
  }, []);

  const { daysLeft, hoursLeft, minutesLeft, secondsLeft } = useMemo(() => {
    const d = new Date(now);
    const y = d.getFullYear();
    const m = d.getMonth(); // 0-11
    const day = d.getDate();

    // Definimos quincenas: 15 y último día del mes
    const fifteenth = new Date(y, m, 15, 23, 59, 59);
    const lastOfMonth = new Date(y, m + 1, 0, 23, 59, 59); // 0 => último día del mes anterior

    const target = day <= 15 ? fifteenth : lastOfMonth;
    const diffMs = target.getTime() - d.getTime();
    
    // Calcular días, horas, minutos y segundos
    const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const diffHours = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
    const diffMinutes = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)));
    const diffSeconds = Math.max(0, Math.floor((diffMs % (1000 * 60)) / 1000));

    return { 
      daysLeft: diffDays, 
      hoursLeft: diffHours, 
      minutesLeft: diffMinutes, 
      secondsLeft: diffSeconds,
      nextPayday: target 
    };
  }, [now]);

  return (
    <div className="text-center mb-12">
      <div className="bg-gradient-to-r from-blue-500/20 to-orange-500/20 border border-black-400/30 rounded-2xl p-6 backdrop-blur-sm shadow-xl max-w-4xl mx-auto">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-red-100 mb-2">TU PRÓXIMA PLANILLA ES EN</h3>
          <div className="flex items-center justify-center gap-3 text-3xl font-bold text-white">
            <div className="bg-white/20 rounded-xl px-4 py-2 min-w-[80px]">
              <span className="block text-4xl">{daysLeft}</span>
              <span className="text-sm text-red-100">DÍAS</span>
            </div>
            <span className="text-red-300">:</span>
            <div className="bg-white/20 rounded-xl px-4 py-2 min-w-[80px]">
              <span className="block text-4xl">{hoursLeft.toString().padStart(2, '0')}</span>
              <span className="text-sm text-red-100">HORAS</span>
            </div>
            <span className="text-red-300">:</span>
            <div className="bg-white/20 rounded-xl px-4 py-2 min-w-[80px]">
              <span className="block text-4xl">{minutesLeft.toString().padStart(2, '0')}</span>
              <span className="text-sm text-red-100">MIN</span>
            </div>
            <span className="text-red-300">:</span>
            <div className="bg-white/20 rounded-xl px-4 py-2 min-w-[80px]">
              <span className="block text-4xl">{secondsLeft.toString().padStart(2, '0')}</span>
              <span className="text-sm text-red-100">SEG</span>
            </div>
          </div>
        </div>
        <div className="text-center mt-4">
          <button
            onClick={() => window.location.href = '/activar'}
            className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-base font-semibold shadow-lg bg-sky-600 text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all duration-300 hover:-translate-y-0.5"
            data-analytics="cta_countdown_click"
          >
            Dejá tu planilla lista → Activar GRATIS hoy
          </button>
        </div>
        <p className="text-center text-red-100 text-sm font-medium mt-3">
          De horas a minutos: dejala lista desde hoy, y olvidate de ella para siempre.
        </p>
      </div>
    </div>
  );
}
