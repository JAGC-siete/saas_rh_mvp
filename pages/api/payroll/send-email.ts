import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { to, type = 'planilla', periodo, quincena, employeeId } = req.body || {}
    if (!to || !periodo) return res.status(400).json({ error: 'Missing to or periodo' })

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.RAILWAY_PUBLIC_DOMAIN || ''
    const origin = baseUrl ? (baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`) : ''

    let downloadPath = ''
    if (type === 'recibo') {
      if (!employeeId || !quincena) return res.status(400).json({ error: 'Missing employeeId or quincena for recibo' })
      downloadPath = `/api/payroll/receipt?periodo=${encodeURIComponent(periodo)}&quincena=${encodeURIComponent(quincena)}&employeeId=${encodeURIComponent(employeeId)}`
    } else {
      if (!quincena) return res.status(400).json({ error: 'Missing quincena for planilla' })
      downloadPath = `/api/payroll/report?periodo=${encodeURIComponent(periodo)}&quincena=${encodeURIComponent(quincena)}`
    }

    const downloadUrl = origin ? `${origin}${downloadPath}` : downloadPath

    const apiKey = process.env['RESEND_API_KEY'] || ''
    if (!apiKey) {
      // Si no hay clave, devolver link para que el cliente pueda enviarlo manualmente
      return res.status(200).json({ sent: false, reason: 'RESEND_API_KEY missing', downloadUrl })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)
    const subject = type === 'recibo' ? `Recibo de pago ${periodo} Q${quincena}` : `Planilla ${periodo} Q${quincena}`
    const body = `Hola,

Puedes descargar el PDF en el siguiente enlace seguro:
${downloadUrl}

Saludos.`
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM || 'noreply@cloudhr.hn',
      to,
      subject,
      text: body,
    })
    if ((result as any)?.error) return res.status(500).json({ error: (result as any).error?.message || 'Send failed' })
    return res.status(200).json({ sent: true, id: (result as any)?.id, downloadUrl })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Internal error' })
  }
}


