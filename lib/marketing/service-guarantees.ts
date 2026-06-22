/** Garantías oficiales del servicio Humano SISU (marketing / landings). */

export interface ServiceGuarantee {
  title: string
  description: string
  icon: string
}

export const SERVICE_GUARANTEES: ServiceGuarantee[] = [
  {
    title: 'Activación inmediata',
    description:
      'Crea tu cuenta y empieza a usar el sistema sin esperar semanas de consultoría. Parametrización local lista para Honduras, El Salvador y Guatemala.',
    icon: '⚡'
  },
  {
    title: 'Implementación biométrica en 72 horas o menos',
    description:
      'Con la información, accesos y responsables acordados, conectamos tu biométrico a la nómina en 72 horas o menos.',
    icon: '🔐'
  },
  {
    title: 'Asistencia en migración de datos',
    description:
      'Te ayudamos a importar empleados e historial desde Excel u otro sistema, sin perder información al cambiar de plataforma.',
    icon: '📥'
  },
  {
    title: 'Capacitación y actualizaciones incluidas',
    description:
      'Capacitación de tu equipo y actualizaciones del software incluidas en tu plan, sin costo adicional por formación ni por ajustes legales.',
    icon: '🎓'
  },
  {
    title: 'Sin límite de usuarios',
    description:
      'Agrega empleados y usuarios administrativos sin pagar licencia extra por cada puesto.',
    icon: '👥'
  },
  {
    title: 'Garantía de 30 días: dinero de regreso',
    description:
      'Si no cumplimos lo acordado en los primeros 30 días, te devolvemos tu dinero según los términos de servicio.',
    icon: '💰'
  }
]
