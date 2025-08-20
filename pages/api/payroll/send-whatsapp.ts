import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { phone, type = 'planilla', periodo, quincena, employeeId } = req.body || {}
    if (!phone || !periodo || !quincena) return res.status(400).json({ error: 'Missing phone/periodo/quincena' })
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.RAILWAY_PUBLIC_DOMAIN || ''
    const origin = baseUrl ? (baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`) : ''
    let downloadPath = ''
    if (type === 'recibo') {
      if (!employeeId) return res.status(400).json({ error: 'Missing employeeId for recibo' })
      downloadPath = `/api/payroll/receipt?periodo=${encodeURIComponent(periodo)}&quincena=${encodeURIComponent(quincena)}&employeeId=${encodeURIComponent(employeeId)}`
    } else {
      downloadPath = `/api/payroll/report?periodo=${encodeURIComponent(periodo)}&quincena=${encodeURIComponent(quincena)}`
    }
    const url = origin ? `${origin}${downloadPath}` : downloadPath

    // Enlace click-to-chat. Para producción, integrar proveedor (Twilio/Meta WhatsApp Cloud API)
    const message = encodeURIComponent(`Descarga tu ${type==='recibo'?'recibo':'planilla'}: ${url}`)
    const waLink = `https://wa.me/${phone}?text=${message}`
    return res.status(200).json({ sent: false, provider: 'link', url: waLink })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Internal error' })
  }
}


