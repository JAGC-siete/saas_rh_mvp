/**
 * Matriz de calculadoras públicas: un registro por (país, tipo).
 *
 * - Las calculadoras existentes (`legacy`) conservan su componente y URL; aquí solo se referencian sus configs.
 * - Las nuevas (`matrix`) se renderizan con components/public-calculator/MatrixCalculatorPage.
 * - `legalValidated=false` ⇒ noindex, fuera del sitemap y del hub, aviso "en validación".
 *   Nadie ha validado aún fórmulas de SV/GT: no agregar cálculo para esos países sin validación humana.
 */
import type { FAQItem } from '../seo/schema'
import { PUBLIC_CALCULATOR_CONFIGS } from './config'
import { PUBLIC_BENEFIT_CONFIGS } from './benefit-config'
import { PUBLIC_PRESTACIONES_CONFIG } from './prestaciones-config'

export type MatrixCountry = 'HND' | 'SLV' | 'GTM'

export type CalculatorType =
  | 'deducciones'
  | 'prestaciones'
  | 'aguinaldo'
  | 'catorceavo'
  | 'vacaciones'
  | 'horas-extra'
  | 'indemnizacion'
  | 'bono-14'

/** Motor de cálculo de la página matrix; null = página informativa sin cálculo. */
export type MatrixEngine = 'vacaciones-hn' | 'horas-extra-hn' | null

export interface LegalBasis {
  /** null = artículo por confirmar (no publicar indexable así). */
  article: string | null
  law: string
  sourceUrl?: string
}

export interface WorkedExample {
  inputs: string[]
  steps: string[]
  result: string
}

interface BaseEntry {
  country: MatrixCountry
  type: CalculatorType
  path: string
  title: string
  description: string
  faqs: FAQItem[]
  legalBasis: LegalBasis[]
  /** Fecha en que se revisó la base legal (ISO). */
  vigenteA: string
  legalValidated: boolean
  hubLabel: string
  hubSubtitle: string
}

export interface LegacyCalculatorEntry extends BaseEntry {
  kind: 'legacy'
}

export interface MatrixCalculatorEntry extends BaseEntry {
  kind: 'matrix'
  engine: MatrixEngine
  breadcrumbLabel: string
  h1: string
  /** Respuesta directa (answer-first) bajo el H1. */
  answer: string
  workedExample: WorkedExample | null
  keywords: string
}

export type CalculatorEntry = LegacyCalculatorEntry | MatrixCalculatorEntry

export const COUNTRY_LABEL: Record<MatrixCountry, string> = {
  HND: 'Honduras',
  SLV: 'El Salvador',
  GTM: 'Guatemala',
}

export const COUNTRY_SCHEMA_LANG: Record<MatrixCountry, string> = {
  HND: 'es-HN',
  SLV: 'es-SV',
  GTM: 'es-GT',
}

const STSS_GUIDE = 'https://www.trabajo.gob.hn/wp-content/uploads/2017/11/guiacalculo.pdf'
const REVIEWED = '2026-10-06'

function legacy(
  country: MatrixCountry,
  type: CalculatorType,
  cfg: { path: string; seo: { title: string; description: string }; faqs: FAQItem[] },
  hubLabel: string,
  hubSubtitle: string,
  legalBasis: LegalBasis[] = []
): LegacyCalculatorEntry {
  return {
    kind: 'legacy',
    country,
    type,
    path: cfg.path,
    title: cfg.seo.title,
    description: cfg.seo.description,
    faqs: cfg.faqs,
    legalBasis,
    vigenteA: REVIEWED,
    legalValidated: true,
    hubLabel,
    hubSubtitle,
  }
}

/** Página informativa SV/GT mientras no haya validador legal de fórmulas. */
function pendingInfo(
  country: Exclude<MatrixCountry, 'HND'>,
  type: CalculatorType,
  path: string,
  label: string
): MatrixCalculatorEntry {
  const pais = COUNTRY_LABEL[country]
  return {
    kind: 'matrix',
    engine: null,
    country,
    type,
    path,
    title: `Calculadora de ${label.toLowerCase()} ${pais} | Humano SISU`,
    description: `Calculadora de ${label.toLowerCase()} para ${pais} en validación legal. Mientras tanto, calcula tus deducciones de ley gratis.`,
    keywords: `calculadora ${label.toLowerCase()} ${pais.toLowerCase()}`,
    breadcrumbLabel: `${label} ${pais}`,
    h1: `Calculadora de ${label.toLowerCase()} en ${pais}`,
    answer: `Esta calculadora está en validación legal y todavía no muestra montos. Cuando un especialista en derecho laboral de ${pais} valide la fórmula, la publicaremos aquí.`,
    workedExample: null,
    faqs: [],
    legalBasis: [{ article: null, law: `Código de Trabajo de ${pais}` }],
    vigenteA: REVIEWED,
    legalValidated: false,
    hubLabel: label,
    hubSubtitle: pais,
  }
}

export const CALCULATOR_REGISTRY: CalculatorEntry[] = [
  // ---- Existentes (no cambian URL ni componente) ----
  legacy('HND', 'deducciones', PUBLIC_CALCULATOR_CONFIGS.HND, 'Deducciones', 'Seguro Social, RAP e ISR'),
  legacy('SLV', 'deducciones', PUBLIC_CALCULATOR_CONFIGS.SLV, 'Deducciones', 'Seguro Social, AFP e ISR'),
  legacy('GTM', 'deducciones', PUBLIC_CALCULATOR_CONFIGS.GTM, 'Deducciones', 'Seguro Social e ISR'),
  legacy('HND', 'prestaciones', PUBLIC_PRESTACIONES_CONFIG, 'Prestaciones y finiquito', 'Cesantía, preaviso, vacaciones, 13vo y 14vo', [
    { article: null, law: 'Guía de cálculos de prestaciones STSS', sourceUrl: STSS_GUIDE },
  ]),
  legacy('HND', 'aguinaldo', PUBLIC_BENEFIT_CONFIGS['13AVO'], 'Aguinaldo (13vo)', 'Décimo tercer mes en lempiras', [
    { article: null, law: 'Decreto No. 112-82' },
  ]),
  legacy('HND', 'catorceavo', PUBLIC_BENEFIT_CONFIGS['14AVO'], 'Catorceavo (14vo)', 'Décimo cuarto mes jul–jun', [
    { article: null, law: 'Decreto No. 135-94' },
  ]),

  // ---- Nuevas Honduras ----
  {
    kind: 'matrix',
    engine: 'vacaciones-hn',
    country: 'HND',
    type: 'vacaciones',
    path: '/calculadora-vacaciones-honduras',
    title: 'Calculadora vacaciones Honduras 2026 | Días y pago',
    description:
      'Cuántos días de vacaciones te tocan en Honduras (10, 12, 15 o 20 según antigüedad) y cuánto te deben pagar. Gratis, con la base del Art. 346.',
    keywords: 'calculadora vacaciones honduras, dias de vacaciones honduras, pago de vacaciones honduras, art 346 codigo del trabajo',
    breadcrumbLabel: 'Vacaciones Honduras',
    h1: 'Calculadora de vacaciones en Honduras',
    answer:
      'En Honduras te corresponden 10 días de vacaciones al cumplir el primer año, 12 al segundo, 15 al tercero y 20 desde el cuarto (Art. 346 del Código del Trabajo). Cada día se paga a tu salario diario: salario mensual ÷ 30.',
    workedExample: {
      inputs: ['Salario mensual: L 15,000', 'Antigüedad: 3 años completos'],
      steps: ['Salario diario: L 15,000 ÷ 30 = L 500', 'Días por el tercer año: 15 (Art. 346)', '15 días × L 500'],
      result: 'L 7,500 de vacaciones del último año completo',
    },
    faqs: [
      {
        question: '¿Cuántos días de vacaciones me tocan en Honduras?',
        answer:
          'Según el Art. 346 del Código del Trabajo: 10 días después del primer año de trabajo, 12 después del segundo, 15 después del tercero y 20 a partir del cuarto año.',
      },
      {
        question: '¿Cómo se calcula el pago de las vacaciones?',
        answer:
          'Se toma el salario diario (salario mensual ÷ 30) y se multiplica por los días de vacaciones que te corresponden. Con L 15,000 al mes y 15 días: L 500 × 15 = L 7,500.',
      },
      {
        question: '¿Qué pasa con mis vacaciones si salgo de la empresa antes de completar el año?',
        answer:
          'En la liquidación se pagan las vacaciones proporcionales del año en curso. La guía de cálculos de la Secretaría de Trabajo (STSS) divide los días trabajados del año entre 36 el primer año, 30 el segundo, 24 el tercero y 18 desde el cuarto. La calculadora de prestaciones lo incluye en tu finiquito.',
      },
    ],
    legalBasis: [
      { article: 'Art. 346', law: 'Código del Trabajo de Honduras' },
      { article: null, law: 'Guía de cálculos de prestaciones STSS (vacaciones proporcionales)', sourceUrl: STSS_GUIDE },
    ],
    vigenteA: REVIEWED,
    legalValidated: true,
    hubLabel: 'Vacaciones',
    hubSubtitle: 'Días según antigüedad y cuánto te pagan',
  },
  {
    kind: 'matrix',
    engine: 'horas-extra-hn',
    country: 'HND',
    type: 'horas-extra',
    path: '/calculadora-horas-extra-honduras',
    title: 'Calculadora horas extra Honduras 2026 | Recargos',
    description:
      'Calcula tus horas extra en Honduras: tarifa = salario ÷ 240 y recargo de 25%, 50%, 75% o 100% según la hora. Mismo motor que la planilla Humano SISU.',
    keywords: 'calculadora horas extra honduras, como se calculan las horas extras en honduras, recargo horas extra honduras',
    breadcrumbLabel: 'Horas extra Honduras',
    h1: 'Calculadora de horas extra en Honduras',
    answer:
      'La hora ordinaria vale tu salario mensual ÷ 240. Cada hora extra se paga con recargo según la franja: 25% (5:00–6:59 pm y 5:00–6:59 am), 50% (7:00–9:59 pm), 75% (10:00 pm–4:59 am) y 100% en días feriados.',
    workedExample: {
      inputs: ['Salario mensual: L 24,000', '10 horas extra entre 5:00 y 6:59 pm'],
      steps: ['Hora ordinaria: L 24,000 ÷ 240 = L 100', 'Recargo 25%: L 100 × 1.25 = L 125', '10 h × L 125'],
      result: 'L 1,250 de horas extra',
    },
    faqs: [
      {
        question: '¿Cómo se calcula el valor de la hora extra en Honduras?',
        answer:
          'Primero se saca la hora ordinaria: salario mensual ÷ 240 (30 días × 8 horas). Luego se multiplica por el recargo de la franja (1.25, 1.50, 1.75 o 2.00) y por las horas trabajadas.',
      },
      {
        question: '¿Qué recargo lleva cada horario?',
        answer:
          '25% de 5:00 a 6:59 pm y de 5:00 a 6:59 am; 50% de 7:00 a 9:59 pm; 75% de 10:00 pm a 4:59 am; 100% en días feriados.',
      },
    ],
    // TODO(legal): confirmar el artículo del Código del Trabajo que fija los recargos antes de indexar.
    legalBasis: [{ article: null, law: 'Código del Trabajo de Honduras (recargos por jornada extraordinaria)' }],
    vigenteA: REVIEWED,
    legalValidated: false,
    hubLabel: 'Horas extra',
    hubSubtitle: 'Recargos de 25% a 100% según la hora',
  },

  // ---- El Salvador y Guatemala: solo estructura, sin cálculo ----
  pendingInfo('SLV', 'aguinaldo', '/calculadora-aguinaldo-el-salvador', 'Aguinaldo'),
  pendingInfo('SLV', 'indemnizacion', '/calculadora-indemnizacion-el-salvador', 'Indemnización'),
  pendingInfo('SLV', 'vacaciones', '/calculadora-vacaciones-el-salvador', 'Vacaciones'),
  pendingInfo('GTM', 'bono-14', '/calculadora-bono-14-guatemala', 'Bono 14'),
  pendingInfo('GTM', 'aguinaldo', '/calculadora-aguinaldo-guatemala', 'Aguinaldo'),
  pendingInfo('GTM', 'indemnizacion', '/calculadora-indemnizacion-guatemala', 'Indemnización'),
]

export function calculatorByPath(path: string): CalculatorEntry | undefined {
  return CALCULATOR_REGISTRY.find((e) => e.path === path)
}

export function matrixCalculator(path: string): MatrixCalculatorEntry {
  const entry = calculatorByPath(path)
  if (!entry || entry.kind !== 'matrix') throw new Error(`No matrix calculator registered for ${path}`)
  return entry
}

export function indexableCalculators(): CalculatorEntry[] {
  return CALCULATOR_REGISTRY.filter((e) => e.legalValidated)
}

/** Nuevas páginas matrix indexables (las legacy ya tienen su propia entrada en el sitemap). */
export function indexableMatrixCalculators(): MatrixCalculatorEntry[] {
  return CALCULATOR_REGISTRY.filter((e): e is MatrixCalculatorEntry => e.kind === 'matrix' && e.legalValidated)
}
