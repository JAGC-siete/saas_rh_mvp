import Decimal from 'decimal.js'
import { z } from 'zod'
import { CesantiasRequestInput, motivoSalidaEnum } from './cesantias-schema'
import {
  diffDays360,
  DIAS_ANO_COMERCIAL,
  DIAS_MES_COMERCIAL,
  parseDateYmd,
} from './thirteenth-fourteenth/calendar'
import { calculateLiquidation13vo14vo } from './thirteenth-fourteenth/calculate'

export { DIAS_MES_COMERCIAL, DIAS_ANO_COMERCIAL, parseDateYmd } from './thirteenth-fourteenth/calendar'
export const CESANTIA_MAX_ANOS = 25

/** Aporte patronal RAP al Fondo de Reserva Laboral (capitalización individual). */
export const RESERVA_LABORAL_RATE = 0.04

/**
 * Disclaimer alineado a la calculadora pública STSS.
 * @see https://www.trabajo.gob.hn/wp-content/uploads/2017/11/guiacalculo.pdf
 */
export const RESERVA_LABORAL_DISCLAIMER =
  'El concepto de reserva laboral está calculado en base al salario de los últimos 6 meses conforme la información proporcionada por el usuario. Este valor puede variar en relación con el monto efectivo depositado en el RAP.'

/**
 * Divisores STSS para vacaciones proporcionales del año incompleto.
 * Año 1→36, año 2→30, año 3→24, año 4+→18.
 * @see Guía STSS: https://www.trabajo.gob.hn/wp-content/uploads/2017/11/guiacalculo.pdf
 */
export function vacationProportionalDivisor(anosCompletos: number): number {
  if (anosCompletos <= 0) return 36
  if (anosCompletos === 1) return 30
  if (anosCompletos === 2) return 24
  return 18
}

/** Días de vacaciones del último año completo (Art. 346 CT). */
export function vacationDaysForCompletedYears(anosCompletos: number): number {
  if (anosCompletos >= 4) return 20
  if (anosCompletos === 3) return 15
  if (anosCompletos === 2) return 12
  if (anosCompletos >= 1) return 10
  return 0
}

export type MotivoSalida = z.infer<typeof motivoSalidaEnum>

export interface BasesSalariales {
  salarioBaseMensual: number
  salarioBaseDiario: number
  salarioPromedioMensual: number
  salarioPromedioDiario: number
}

export interface TiemposLaborados {
  totalDias: number
  anos: number
  meses: number
  dias: number
  diasAnoNatural: number
  diasDesdeJulio: number
}

export interface RubrosLiquidacion {
  cesantiaBruta: number
  cesantiaNeta: number
  preaviso: number
  vacaciones: number
  aguinaldo: number
  decimoCuarto: number
  rapAplicado: number
  reservaLaboralEstimada: number
  reservaLaboralEnTotal: number
  totalPagar: number
}

export interface LiquidacionResult {
  bases: BasesSalariales
  tiempos: TiemposLaborados
  rubros: RubrosLiquidacion
  metadata: {
    motivoSalida: MotivoSalida
    preavisoGozado: boolean
    salaryAverageMode: 'real_6m' | 'manual_avg' | 'proxy_14_12'
    reservaLaboralDisclaimer: string
    reservaLaboralUsaSaldoReal: boolean
  }
}

function calcularAntiguedad360(fechaIngreso: Date, fechaEgreso: Date): TiemposLaborados {
  const totalDias = diffDays360(fechaIngreso, fechaEgreso)
  const anos = Math.floor(totalDias / DIAS_ANO_COMERCIAL)
  const resto = totalDias % DIAS_ANO_COMERCIAL
  const meses = Math.floor(resto / DIAS_MES_COMERCIAL)
  const dias = resto % DIAS_MES_COMERCIAL

  const egresoYear = fechaEgreso.getFullYear()

  // 13er mes: 1 enero al 31 diciembre (del año de egreso)
  const inicioAnoNatural = new Date(egresoYear, 0, 1)
  const inicio13 = fechaIngreso > inicioAnoNatural ? fechaIngreso : inicioAnoNatural
  const diasAnoNatural = diffDays360(inicio13, fechaEgreso)

  // 14to mes: 1 julio a 30 junio
  const periodo14YearStart = fechaEgreso.getMonth() + 1 >= 7 ? egresoYear : egresoYear - 1
  const inicioDesdeJulio = new Date(periodo14YearStart, 6, 1) // 1 julio
  let diasDesdeJulio = 0
  if (fechaEgreso >= inicioDesdeJulio) {
    const inicio14 = fechaIngreso > inicioDesdeJulio ? fechaIngreso : inicioDesdeJulio
    diasDesdeJulio = diffDays360(inicio14, fechaEgreso)
  }

  return {
    totalDias,
    anos,
    meses,
    dias,
    diasAnoNatural,
    diasDesdeJulio
  }
}

function calcularBasesSalariales(
  salarioBaseMensual: number,
  salarioPromedioMensual: number
): BasesSalariales {
  const base = new Decimal(salarioBaseMensual)
  const salarioBaseDiario = base.div(DIAS_MES_COMERCIAL)
  const promedioMensual = new Decimal(salarioPromedioMensual)
  const salarioPromedioDiario = promedioMensual.div(DIAS_MES_COMERCIAL)

  return {
    salarioBaseMensual: base.toNumber(),
    salarioBaseDiario: salarioBaseDiario.toDecimalPlaces(6).toNumber(),
    salarioPromedioMensual: promedioMensual.toDecimalPlaces(6).toNumber(),
    salarioPromedioDiario: salarioPromedioDiario.toDecimalPlaces(6).toNumber()
  }
}

function calcularSalarioPromedioMensualArt123(input: CesantiasRequestInput): {
  salarioPromedioMensual: number
  mode: 'real_6m' | 'manual_avg' | 'proxy_14_12'
} {
  const { salarioBaseMensual, salarioPromedioMensual, salariosUltimos6Meses } = input.datosManuales

  // Si el caller provee promedio manual, lo respetamos (asumimos ya incluye Art. 123).
  if (typeof salarioPromedioMensual === 'number' && Number.isFinite(salarioPromedioMensual) && salarioPromedioMensual > 0) {
    return { salarioPromedioMensual, mode: 'manual_avg' }
  }

  // Si hay últimos 6 meses (o fracción), promediamos y agregamos 50% de 13° y 14°.
  if (Array.isArray(salariosUltimos6Meses) && salariosUltimos6Meses.length > 0) {
    const valid = salariosUltimos6Meses.filter((x) => typeof x === 'number' && Number.isFinite(x) && x >= 0)
    if (valid.length > 0) {
      const avg6 = new Decimal(valid.reduce((acc, x) => acc + x, 0)).div(valid.length)
      const half13and14Monthly = new Decimal(salarioBaseMensual).div(12) // 50% de 13° + 50% de 14° = 1 salario/12
      return { salarioPromedioMensual: avg6.plus(half13and14Monthly).toNumber(), mode: 'real_6m' }
    }
  }

  // Fallback retrocompatible (proxy actual): base * 14/12
  const proxy = new Decimal(salarioBaseMensual).mul(14).div(12).toNumber()
  return { salarioPromedioMensual: proxy, mode: 'proxy_14_12' }
}

/**
 * Base ordinaria para estimar aportes RAP (4%).
 * No usa el promedio Art. 123 (que incluye 50% de 13°/14°).
 */
function resolverBaseReservaLaboral(input: CesantiasRequestInput): number {
  const { salarioBaseMensual, salariosUltimos6Meses } = input.datosManuales
  if (Array.isArray(salariosUltimos6Meses) && salariosUltimos6Meses.length > 0) {
    const valid = salariosUltimos6Meses.filter((x) => typeof x === 'number' && Number.isFinite(x) && x >= 0)
    if (valid.length > 0) {
      return new Decimal(valid.reduce((acc, x) => acc + x, 0)).div(valid.length).toNumber()
    }
  }
  return salarioBaseMensual
}

function calcularDiasPreaviso(totalDiasLaborados: number): number {
  const anos = totalDiasLaborados / DIAS_ANO_COMERCIAL

  if (totalDiasLaborados < 90) return 1 // 24 horas
  if (totalDiasLaborados >= 90 && totalDiasLaborados < 180) return 7
  if (totalDiasLaborados >= 180 && totalDiasLaborados < DIAS_ANO_COMERCIAL) return 14
  if (anos >= 1 && anos < 2) return 30
  return 60
}

/**
 * Vacaciones en liquidación según guía STSS:
 * - Último año completo (si aplica): días Art. 346 × salario promedio diario
 * - Año incompleto: días_fracción ÷ divisor × salario promedio diario
 *
 * Distinto del goce en empleados activos (requiere año completo, Art. 346).
 * @see https://www.trabajo.gob.hn/wp-content/uploads/2017/11/guiacalculo.pdf
 */
function calcularVacacionesProporcionales(
  salarioPromedioDiario: Decimal,
  tiempos: TiemposLaborados
): Decimal {
  const totalDias = Math.max(0, tiempos.totalDias)
  if (totalDias <= 0) return new Decimal(0)

  const anosCompletos = tiempos.anos
  const diasFraccion = totalDias % DIAS_ANO_COMERCIAL
  const divisor = vacationProportionalDivisor(anosCompletos)

  const vacCompletas =
    anosCompletos >= 1
      ? new Decimal(vacationDaysForCompletedYears(anosCompletos)).mul(salarioPromedioDiario)
      : new Decimal(0)

  const vacProporcionales =
    diasFraccion > 0
      ? new Decimal(diasFraccion).div(divisor).mul(salarioPromedioDiario)
      : new Decimal(0)

  return vacCompletas.plus(vacProporcionales)
}

function calcularCesantia(
  salarioPromedioMensual: Decimal,
  tiempos: TiemposLaborados
): Decimal {
  // Nota: la elegibilidad/factor por motivo se resuelve fuera (ver lógica principal).
  // Aquí implementamos únicamente la tabla de Art. 120 (base + proporcional) en año comercial 360/30.

  const totalDias = Math.max(0, tiempos.totalDias)
  if (totalDias <= 0) return new Decimal(0)

  const salarioPromedioDiario = salarioPromedioMensual.div(DIAS_MES_COMERCIAL)

  // Tramos < 1 año
  if (totalDias < 90) {
    return new Decimal(0)
  }
  if (totalDias >= 90 && totalDias < 180) {
    return salarioPromedioDiario.mul(10)
  }
  if (totalDias >= 180 && totalDias < DIAS_ANO_COMERCIAL) {
    return salarioPromedioDiario.mul(20)
  }

  // > 1 año: 1 mes por año completo + proporcional solo del último año incompleto.
  const anosCompletos = Math.floor(totalDias / DIAS_ANO_COMERCIAL)
  const diasFraccion = totalDias % DIAS_ANO_COMERCIAL

  // Proporcional STSS: (días trabajados en el año incompleto) / 12
  const diasCesantiaProporcional = new Decimal(diasFraccion).div(12)

  // 1 mes = 30 días de salario promedio
  const diasPorAnosCompletos = new Decimal(anosCompletos).mul(DIAS_MES_COMERCIAL)

  const totalDiasCesantia = diasPorAnosCompletos.plus(diasCesantiaProporcional)

  // Tope total: 25 meses de salario = 25 * 30 días
  const maxDiasCesantia = new Decimal(CESANTIA_MAX_ANOS).mul(DIAS_MES_COMERCIAL)
  const cappedDiasCesantia = Decimal.min(totalDiasCesantia, maxDiasCesantia)

  return salarioPromedioDiario.mul(cappedDiasCesantia)
}

function calcularFactorCesantiaPorMotivo(input: CesantiasRequestInput, tiempos: TiemposLaborados): Decimal {
  const { motivoSalida, condiciones } = input.parametrosCalculo

  const tienePensionEquivalente =
    motivoSalida === 'PENSION_JUBILACION_EQUIVALENTE' || condiciones?.tienePensionEquivalente === true
  if (tienePensionEquivalente) return new Decimal(0)

  if (motivoSalida === 'DESPIDO_JUSTIFICADO') return new Decimal(0)
  if (motivoSalida === 'MUTUO_ACUERDO') return new Decimal(0)
  if (motivoSalida === 'FIN_CONTRATO') return new Decimal(0)

  if (motivoSalida === 'RENUNCIA') {
    const cumple15Anos = tiempos.totalDias >= 15 * DIAS_ANO_COMERCIAL
    if (cumple15Anos && condiciones?.retiroVoluntario) {
      return new Decimal(0.35)
    }
    return new Decimal(0)
  }

  if (motivoSalida === 'FALLECIMIENTO') {
    // Regla conocida: 75% si fue natural después de 6 meses (modelo simplificado con flag y antigüedad)
    if (condiciones?.fallecimientoNatural) {
      return tiempos.totalDias >= 180 ? new Decimal(0.75) : new Decimal(0)
    }
    // Si no se especifica, asumimos que sí corresponde cesantía completa (orientativo).
    return new Decimal(1)
  }

  if (motivoSalida === 'DESPIDO_INJUSTIFICADO') return new Decimal(1)
  if (motivoSalida === 'CAUSA_AJENA_TRABAJADOR') return new Decimal(1)

  return new Decimal(0)
}

function aplicaPreaviso(motivoSalida: MotivoSalida): boolean {
  // Preaviso suele aplicar a terminaciones imputables al empleador (modelo orientativo).
  return motivoSalida === 'DESPIDO_INJUSTIFICADO' || motivoSalida === 'CAUSA_AJENA_TRABAJADOR'
}

export function calcularLiquidacionHonduras(
  input: CesantiasRequestInput
): LiquidacionResult {
  const { salarioBaseMensual, fechaIngreso, fechaEgreso } = input.datosManuales
  const { motivoSalida, montoRapAcumulado = 0, preavisoGozado = false } = input.parametrosCalculo

  const ingresoDate = parseDateYmd(fechaIngreso)
  const egresoDate = parseDateYmd(fechaEgreso)

  const avg = calcularSalarioPromedioMensualArt123(input)
  const bases = calcularBasesSalariales(salarioBaseMensual, avg.salarioPromedioMensual)
  const tiempos = calcularAntiguedad360(ingresoDate, egresoDate)

  const salarioPromedioMensualDec = new Decimal(bases.salarioPromedioMensual)
  const salarioPromedioDiarioDec = new Decimal(bases.salarioPromedioDiario)

  // Preaviso
  let preavisoDec = new Decimal(0)
  if (aplicaPreaviso(motivoSalida) && !preavisoGozado) {
    const diasPreaviso = calcularDiasPreaviso(tiempos.totalDias)
    preavisoDec = salarioPromedioDiarioDec.mul(diasPreaviso)
  }

  // Cesantía
  const cesantiaBaseDec = calcularCesantia(
    salarioPromedioMensualDec,
    tiempos
  )
  const factorCesantiaDec = calcularFactorCesantiaPorMotivo(input, tiempos)
  const cesantiaBrutaDec = cesantiaBaseDec.mul(factorCesantiaDec)

  // Vacaciones (guía STSS: SPD + divisores)
  const vacacionesDec = calcularVacacionesProporcionales(
    salarioPromedioDiarioDec,
    tiempos
  )

  // 13er y 14to (salario base, año comercial 360)
  const { aguinaldo, decimoCuarto } = calculateLiquidation13vo14vo(
    bases.salarioBaseMensual,
    tiempos.diasAnoNatural,
    tiempos.diasDesdeJulio
  )
  const aguinaldoDec = new Decimal(aguinaldo)
  const decimoCuartoDec = new Decimal(decimoCuarto)

  // Reserva laboral estimada (4% sobre salario ordinario × meses comerciales)
  const baseReserva = resolverBaseReservaLaboral(input)
  const reservaLaboralEstimadaDec = new Decimal(baseReserva)
    .mul(RESERVA_LABORAL_RATE)
    .mul(new Decimal(tiempos.totalDias).div(DIAS_MES_COMERCIAL))

  const usaSaldoReal = typeof montoRapAcumulado === 'number' && montoRapAcumulado > 0
  const saldoRapDec = usaSaldoReal
    ? new Decimal(montoRapAcumulado)
    : reservaLaboralEstimadaDec

  // RAP: en despido compensa cesantía; en renuncia (u otros sin cesantía) va al total como prima.
  let rapAplicadoDec = new Decimal(0)
  let cesantiaNetaDec = cesantiaBrutaDec
  let reservaLaboralEnTotalDec = new Decimal(0)

  if (cesantiaBrutaDec.greaterThan(0)) {
    rapAplicadoDec = Decimal.min(cesantiaBrutaDec, saldoRapDec)
    cesantiaNetaDec = cesantiaBrutaDec.sub(rapAplicadoDec)
    reservaLaboralEnTotalDec = Decimal.max(0, saldoRapDec.sub(rapAplicadoDec))
  } else {
    reservaLaboralEnTotalDec = saldoRapDec
  }

  const totalPagarDec = preavisoDec
    .plus(cesantiaNetaDec)
    .plus(vacacionesDec)
    .plus(aguinaldoDec)
    .plus(decimoCuartoDec)
    .plus(reservaLaboralEnTotalDec)

  const rubros: RubrosLiquidacion = {
    cesantiaBruta: cesantiaBrutaDec.toDecimalPlaces(2).toNumber(),
    cesantiaNeta: cesantiaNetaDec.toDecimalPlaces(2).toNumber(),
    preaviso: preavisoDec.toDecimalPlaces(2).toNumber(),
    vacaciones: vacacionesDec.toDecimalPlaces(2).toNumber(),
    aguinaldo: aguinaldoDec.toDecimalPlaces(2).toNumber(),
    decimoCuarto: decimoCuartoDec.toDecimalPlaces(2).toNumber(),
    rapAplicado: rapAplicadoDec.toDecimalPlaces(2).toNumber(),
    reservaLaboralEstimada: reservaLaboralEstimadaDec.toDecimalPlaces(2).toNumber(),
    reservaLaboralEnTotal: reservaLaboralEnTotalDec.toDecimalPlaces(2).toNumber(),
    totalPagar: totalPagarDec.toDecimalPlaces(2).toNumber()
  }

  return {
    bases,
    tiempos,
    rubros,
    metadata: {
      motivoSalida,
      preavisoGozado,
      salaryAverageMode: avg.mode,
      reservaLaboralDisclaimer: RESERVA_LABORAL_DISCLAIMER,
      reservaLaboralUsaSaldoReal: usaSaldoReal
    }
  }
}
