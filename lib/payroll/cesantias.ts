import Decimal from 'decimal.js'
import { z } from 'zod'
import { CesantiasRequestInput, motivoSalidaEnum } from './cesantias-schema'

export const DIAS_MES_COMERCIAL = 30
export const DIAS_ANO_COMERCIAL = 360
export const CESANTIA_MAX_ANOS = 25

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
  totalPagar: number
}

export interface LiquidacionResult {
  bases: BasesSalariales
  tiempos: TiemposLaborados
  rubros: RubrosLiquidacion
  metadata: {
    motivoSalida: MotivoSalida
    preavisoGozado: boolean
  }
}

interface CommercialDate {
  year: number
  month: number
  day: number
}

function toCommercialDate(date: Date): CommercialDate {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: Math.min(date.getDate(), 30)
  }
}

function toCommercialDayNumber(date: Date): number {
  const d = toCommercialDate(date)
  return d.year * DIAS_ANO_COMERCIAL + (d.month - 1) * DIAS_MES_COMERCIAL + (d.day - 1)
}

function diffDays360(start: Date, end: Date): number {
  const startNum = toCommercialDayNumber(start)
  const endNum = toCommercialDayNumber(end)
  if (endNum < startNum) {
    return 0
  }
  return endNum - startNum + 1
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

function calcularBasesSalariales(salarioBaseMensual: number): BasesSalariales {
  const base = new Decimal(salarioBaseMensual)
  const salarioBaseDiario = base.div(DIAS_MES_COMERCIAL)
  const salarioPromedioMensual = base.mul(14).div(12)
  const salarioPromedioDiario = salarioPromedioMensual.div(DIAS_MES_COMERCIAL)

  return {
    salarioBaseMensual: base.toNumber(),
    salarioBaseDiario: salarioBaseDiario.toDecimalPlaces(6).toNumber(),
    salarioPromedioMensual: salarioPromedioMensual.toDecimalPlaces(6).toNumber(),
    salarioPromedioDiario: salarioPromedioDiario.toDecimalPlaces(6).toNumber()
  }
}

function calcularDiasPreaviso(totalDiasLaborados: number): number {
  // Convertir a años aproximados para la tabla de preaviso
  const anos = totalDiasLaborados / DIAS_ANO_COMERCIAL

  if (totalDiasLaborados < 90) return 1 // 24 horas
  if (totalDiasLaborados >= 90 && totalDiasLaborados < 180) return 7
  if (totalDiasLaborados >= 180 && totalDiasLaborados < DIAS_ANO_COMERCIAL) return 14
  if (anos >= 1 && anos < 2) return 30
  return 60
}

function calcularVacacionesProporcionales(
  salarioBaseDiario: Decimal,
  tiempos: TiemposLaborados
): Decimal {
  const anosServicio = tiempos.anos
  let diasVacacionesAnuales = 0

  if (anosServicio >= 4) {
    diasVacacionesAnuales = 20
  } else if (anosServicio === 3) {
    diasVacacionesAnuales = 15
  } else if (anosServicio === 2) {
    diasVacacionesAnuales = 12
  } else if (anosServicio >= 1) {
    diasVacacionesAnuales = 10
  }

  if (diasVacacionesAnuales === 0) {
    return new Decimal(0)
  }

  const diasPeriodo = Math.min(tiempos.totalDias, DIAS_ANO_COMERCIAL)
  return new Decimal(diasVacacionesAnuales)
    .div(DIAS_ANO_COMERCIAL)
    .mul(diasPeriodo)
    .mul(salarioBaseDiario)
}

function calcularAguinaldo(
  salarioBaseMensual: Decimal,
  diasAnoNatural: number
): Decimal {
  if (diasAnoNatural <= 0) return new Decimal(0)
  return salarioBaseMensual
    .div(DIAS_ANO_COMERCIAL)
    .mul(diasAnoNatural)
}

function calcularDecimoCuarto(
  salarioBaseMensual: Decimal,
  diasDesdeJulio: number
): Decimal {
  if (diasDesdeJulio <= 0) return new Decimal(0)
  return salarioBaseMensual
    .div(DIAS_ANO_COMERCIAL)
    .mul(diasDesdeJulio)
}

function calcularCesantia(
  salarioPromedioMensual: Decimal,
  tiempos: TiemposLaborados,
  motivoSalida: MotivoSalida
): Decimal {
  if (motivoSalida !== 'DESPIDO_INJUSTIFICADO') {
    // En renuncia/despido justificado la cesantía se cubre vía RAP (reserva laboral), no se paga directa
    return new Decimal(0)
  }

  const maxDias = CESANTIA_MAX_ANOS * DIAS_ANO_COMERCIAL
  const diasParaCesantia = Math.min(tiempos.totalDias, maxDias)
  if (diasParaCesantia <= 0) return new Decimal(0)

  return salarioPromedioMensual
    .div(DIAS_ANO_COMERCIAL)
    .mul(diasParaCesantia)
}

export function calcularLiquidacionHonduras(
  input: CesantiasRequestInput
): LiquidacionResult {
  const { salarioBaseMensual, fechaIngreso, fechaEgreso } = input.datosManuales
  const { motivoSalida, montoRapAcumulado = 0, preavisoGozado = false } = input.parametrosCalculo

  const ingresoDate = new Date(fechaIngreso)
  const egresoDate = new Date(fechaEgreso)

  const bases = calcularBasesSalariales(salarioBaseMensual)
  const tiempos = calcularAntiguedad360(ingresoDate, egresoDate)

  const salarioBaseMensualDec = new Decimal(bases.salarioBaseMensual)
  const salarioBaseDiarioDec = new Decimal(bases.salarioBaseDiario)
  const salarioPromedioMensualDec = new Decimal(bases.salarioPromedioMensual)
  const salarioPromedioDiarioDec = new Decimal(bases.salarioPromedioDiario)

  // Preaviso
  let preavisoDec = new Decimal(0)
  if (motivoSalida === 'DESPIDO_INJUSTIFICADO' && !preavisoGozado) {
    const diasPreaviso = calcularDiasPreaviso(tiempos.totalDias)
    preavisoDec = salarioPromedioDiarioDec.mul(diasPreaviso)
  }

  // Cesantía
  const cesantiaBrutaDec = calcularCesantia(
    salarioPromedioMensualDec,
    tiempos,
    motivoSalida
  )

  // Vacaciones
  const vacacionesDec = calcularVacacionesProporcionales(
    salarioBaseDiarioDec,
    tiempos
  )

  // 13er y 14to
  const aguinaldoDec = calcularAguinaldo(
    salarioBaseMensualDec,
    tiempos.diasAnoNatural
  )
  const decimoCuartoDec = calcularDecimoCuarto(
    salarioBaseMensualDec,
    tiempos.diasDesdeJulio
  )

  // Compensación RAP (solo cuando hay cesantía calculada)
  let rapAplicadoDec = new Decimal(0)
  let cesantiaNetaDec = cesantiaBrutaDec
  if (cesantiaBrutaDec.greaterThan(0) && montoRapAcumulado > 0) {
    rapAplicadoDec = Decimal.min(cesantiaBrutaDec, new Decimal(montoRapAcumulado))
    cesantiaNetaDec = cesantiaBrutaDec.sub(rapAplicadoDec)
  }

  const totalPagarDec = preavisoDec
    .plus(cesantiaNetaDec)
    .plus(vacacionesDec)
    .plus(aguinaldoDec)
    .plus(decimoCuartoDec)

  const rubros: RubrosLiquidacion = {
    cesantiaBruta: cesantiaBrutaDec.toDecimalPlaces(2).toNumber(),
    cesantiaNeta: cesantiaNetaDec.toDecimalPlaces(2).toNumber(),
    preaviso: preavisoDec.toDecimalPlaces(2).toNumber(),
    vacaciones: vacacionesDec.toDecimalPlaces(2).toNumber(),
    aguinaldo: aguinaldoDec.toDecimalPlaces(2).toNumber(),
    decimoCuarto: decimoCuartoDec.toDecimalPlaces(2).toNumber(),
    rapAplicado: rapAplicadoDec.toDecimalPlaces(2).toNumber(),
    totalPagar: totalPagarDec.toDecimalPlaces(2).toNumber()
  }

  return {
    bases,
    tiempos,
    rubros,
    metadata: {
      motivoSalida,
      preavisoGozado
    }
  }
}

