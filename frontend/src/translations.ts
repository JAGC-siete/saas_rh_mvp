/**
 * Translation keys for HumanoSisu application
 * Used for internationalization support
 */

export type TranslationKey = {
  [key: string]: string | TranslationKey;
};

const translations = {
  es: {
    common: {
      submit: 'Enviar',
      cancel: 'Cancelar',
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
      back: 'Volver',
      next: 'Siguiente',
      save: 'Guardar',
      delete: 'Eliminar',
      edit: 'Editar',
      view: 'Ver',
    },
    navigation: {
      home: 'Inicio',
      attendance: 'Asistencia',
      payroll: 'Nómina',
      employees: 'Empleados',
      reports: 'Reportes',
      settings: 'Configuración',
      logout: 'Cerrar sesión',
      login: 'Iniciar sesión',
    },
    auth: {
      login: 'Iniciar sesión',
      logout: 'Cerrar sesión',
      username: 'Usuario',
      password: 'Contraseña',
      forgotPassword: 'Olvidé mi contraseña',
      loginError: 'Usuario o contraseña incorrectos',
    },
    attendance: {
      title: 'Registro de Asistencia',
      employeeId: 'Últimos 5 dígitos del DNI',
      register: 'Registrar asistencia',
      justification: 'Justificación',
      justificationPlaceholder: '¿Por qué llegaste tarde?',
      submitJustification: 'Enviar Justificación',
      success: 'Asistencia registrada con éxito',
    },
    payroll: {
      title: 'Generar Planilla',
      period: 'Periodo (YYYY-MM)',
      fortnight: 'Quincena',
      firstFortnight: 'Quincena 1',
      secondFortnight: 'Quincena 2',
      generate: 'Generar PDF',
      generateSuccess: 'Planilla generada con éxito',
    },
    landing: {
      hero: {
        title: 'HumanoSisu',
        subtitle: 'Sistema de Recursos Humanos',
        description: 'Optimiza tu gestión de recursos humanos con nuestra plataforma integral',
        cta: 'Comienza Gratis',
      },
      features: {
        attendance: {
          title: 'Control de Asistencia',
          description: 'Gestiona fácilmente la asistencia de tus empleados',
        },
        payroll: {
          title: 'Generación de Nómina',
          description: 'Automatiza el cálculo y generación de planillas de pago',
        },
        employees: {
          title: 'Gestión de Empleados',
          description: 'Administra la información y documentos de tu personal',
        },
      },
    },
  },
  en: {
    // English translations can be added in the future
  },
};

export default translations;