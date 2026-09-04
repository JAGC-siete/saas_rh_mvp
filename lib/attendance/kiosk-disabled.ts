import type { NextApiResponse } from 'next'

export const PUBLIC_ATTENDANCE_KIOSK_GONE =
  'El kiosco público de asistencia (DNI / últimos 5 dígitos) está deshabilitado.'

export function sendPublicAttendanceKioskGone(res: NextApiResponse) {
  res.setHeader('Allow', '')
  return res.status(410).json({
    error: 'Gone',
    message: PUBLIC_ATTENDANCE_KIOSK_GONE,
  })
}
