import { Resend } from 'resend'
import { LIQUID } from '../brand/liquid-tokens'
import {
  escapeHtml,
  transactionalInfoBox,
  transactionalKeyValueTable,
  transactionalParagraph,
  wrapTransactionalEmail,
} from './transactional-layout'
import { getResendFromNoreply } from '../resend-from'
import { formatPeriodRangeForDisplay } from '../payroll/period-dates'
import type {
  LateAttendanceReportData,
  LateReportDetail,
  LateReportEmployee,
} from '../reports/late-attendance-pdf'
import {
  LATE_ARRIVAL_REPORT_TITLE,
  formatLateMinutes,
  generateLateAttendanceReportPDF,
} from '../reports/late-attendance-pdf'

export type LateAttendanceEmailPayload = LateAttendanceReportData

const T = LIQUID
const CELL =
  `padding:6px 8px;border:1px solid ${T.glassBorderLight};color:${T.text};font-size:13px;`
const CELL_SM =
  `padding:5px 6px;border:1px solid ${T.glassBorderLight};color:${T.text};font-size:12px;`

function buildObservations(data: LateAttendanceReportData): string[] {
  const notes: string[] = []
  const { employees, details, metrics } = data
  if ((metrics.total_late_incidents ?? 0) === 0) return notes

  const top = employees[0]
  if (top && top.late_days >= 5) {
    notes.push(
      `${top.employee_name} (${top.employee_code ?? 'sin código'}) acumula ${top.late_days} días con tardanza en el periodo.`
    )
  }

  const extreme = employees.filter((e) => Number(e.avg_late_minutes) > 60)
  if (extreme.length > 0) {
    notes.push(
      `${extreme.length} empleado(s) con promedio superior a 60 min/día — revisar horario asignado o marcas incorrectas.`
    )
  }

  const byDate = new Map<string, number>()
  for (const d of details) {
    byDate.set(d.record_date, (byDate.get(d.record_date) ?? 0) + 1)
  }
  let maxDay = ''
  let maxCount = 0
  for (const [day, count] of byDate) {
    if (count > maxCount) {
      maxCount = count
      maxDay = day
    }
  }
  if (maxDay && maxCount >= 3) {
    notes.push(`Día con más incidentes: ${maxDay} (${maxCount} llegadas tarde).`)
  }

  return notes
}

function renderEmployeeTable(employees: LateReportEmployee[]): string {
  if (employees.length === 0) return ''
  const rows = employees
    .map(
      (e) => `<tr>
        <td style="${CELL}">${escapeHtml(e.employee_code ?? '—')}</td>
        <td style="${CELL}">${escapeHtml(e.employee_name)}</td>
        <td style="${CELL}">${escapeHtml(e.department_name ?? '—')}</td>
        <td style="${CELL}text-align:center;">${e.late_days}</td>
        <td style="${CELL}text-align:center;">${escapeHtml(formatLateMinutes(Number(e.avg_late_minutes)))}</td>
      </tr>`
    )
    .join('')
  return `<table role="presentation" style="width:100%;border-collapse:collapse;margin:12px 0;color:${T.text};">
    <thead><tr style="background:${T.brand900};color:#ffffff;">
      <th style="padding:8px;text-align:left;color:#ffffff;font-size:12px;">Código</th>
      <th style="padding:8px;text-align:left;color:#ffffff;font-size:12px;">Empleado</th>
      <th style="padding:8px;text-align:left;color:#ffffff;font-size:12px;">Departamento</th>
      <th style="padding:8px;text-align:center;color:#ffffff;font-size:12px;">Días tarde</th>
      <th style="padding:8px;text-align:center;color:#ffffff;font-size:12px;">Promedio/día</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

function renderDetailTable(details: LateReportDetail[]): string {
  if (details.length === 0) return ''
  const rows = details
    .map(
      (d) => `<tr>
        <td style="${CELL_SM}">${escapeHtml(d.record_date)}</td>
        <td style="${CELL_SM}">${escapeHtml(d.employee_name)}</td>
        <td style="${CELL_SM}text-align:center;">${escapeHtml(d.expected_start ?? '—')}</td>
        <td style="${CELL_SM}text-align:center;">${escapeHtml(d.check_in ?? '—')}</td>
        <td style="${CELL_SM}text-align:center;">${Math.round(Number(d.late_minutes) || 0)}</td>
      </tr>`
    )
    .join('')
  return `<p style="font-weight:600;margin:20px 0 8px 0;color:${T.text};font-size:15px;">Detalle por fecha (${details.length} incidentes)</p>
  <table role="presentation" style="width:100%;border-collapse:collapse;margin:8px 0;color:${T.text};">
    <thead><tr style="background:${T.brand800};color:#ffffff;">
      <th style="padding:6px;text-align:left;font-size:12px;color:#ffffff;">Fecha</th>
      <th style="padding:6px;text-align:left;font-size:12px;color:#ffffff;">Empleado</th>
      <th style="padding:6px;text-align:center;font-size:12px;color:#ffffff;">Esperada</th>
      <th style="padding:6px;text-align:center;font-size:12px;color:#ffffff;">Entrada</th>
      <th style="padding:6px;text-align:center;font-size:12px;color:#ffffff;">Min. tarde</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

export function buildLateAttendanceReportHtml(data: LateAttendanceReportData): string {
  const periodLabel = formatPeriodRangeForDisplay(data.periodStart, data.periodEnd)
  const m = data.metrics
  const hasLate = (m.total_late_incidents ?? 0) > 0
  const observations = buildObservations(data)

  const bodyParts = [
    transactionalKeyValueTable([
      { label: 'Empresa', value: data.companyName },
      { label: 'ID', value: data.companyId },
      { label: 'Período', value: periodLabel },
      {
        label: 'Criterio',
        value: 'Entrada más de 5 min después del horario asignado (tolerancia del sistema).',
      },
    ]),
    transactionalParagraph(`<strong style="color:${T.text};">Resumen general</strong>`),
    transactionalKeyValueTable([
      { label: 'Registros de asistencia', value: String(m.total_attendance_records ?? 0) },
      { label: 'Incidentes de tardanza', value: String(m.total_late_incidents ?? 0) },
      {
        label: 'Empleados con tardanza',
        value: `${m.employees_with_late ?? 0} de ${m.active_employees ?? 0} activos`,
      },
    ]),
  ]

  if (!hasLate) {
    bodyParts.push(
      `<div style="background:${T.successBg};border:1px solid ${T.successBorder};color:${T.success};padding:14px 16px;border-radius:16px;margin:18px 0;font-size:14px;line-height:1.55;">
        <strong style="color:#ffffff;">¡Felicitaciones por la puntualidad!</strong><br>
        0 llegadas tarde en este periodo. El equipo cumplió con los horarios asignados dentro de la tolerancia permitida.
      </div>`
    )
  } else {
    bodyParts.push(
      transactionalParagraph(`<strong style="color:${T.text};">Ranking por empleado</strong>`)
    )
    bodyParts.push(renderEmployeeTable(data.employees))
    bodyParts.push(renderDetailTable(data.details))
    if (observations.length > 0) {
      bodyParts.push(
        transactionalParagraph(`<strong style="color:${T.text};">Observaciones</strong>`)
      )
      bodyParts.push(
        transactionalInfoBox(observations.map((o) => `• ${escapeHtml(o)}`).join('<br>'), 'neutral')
      )
    }
  }

  bodyParts.push(
    transactionalParagraph(
      'Se adjunta el reporte completo en PDF. La llegada tarde se calculó contra el horario efectivo de cada empleado cuando el registro no incluía expected_check_in ni late_minutes.'
    )
  )

  return wrapTransactionalEmail({
    title: hasLate ? LATE_ARRIVAL_REPORT_TITLE : 'Reporte de puntualidad',
    subtitle: data.companyName,
    bodyHtml: bodyParts.join(''),
  })
}

export async function sendLateAttendanceReportEmail(
  to: string,
  data: LateAttendanceReportData
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')

  const periodLabel = formatPeriodRangeForDisplay(data.periodStart, data.periodEnd)
  const hasLate = (data.metrics.total_late_incidents ?? 0) > 0
  const subject = hasLate
    ? `${LATE_ARRIVAL_REPORT_TITLE} — ${data.companyName} — ${periodLabel}`
    : `¡Puntualidad excelente! — ${data.companyName} — ${periodLabel}`

  const html = buildLateAttendanceReportHtml(data)
  const pdfBuffer = await generateLateAttendanceReportPDF(data)
  const filename = `llegadas-tarde-${data.periodStart}_${data.periodEnd}.pdf`

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: getResendFromNoreply({ displayName: 'SISU Asistencia' }),
    to,
    subject,
    html,
    attachments: [{ filename, content: pdfBuffer.toString('base64') }],
  })

  if (error) throw new Error(error.message)
}
