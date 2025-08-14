import type { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { periodo = new Date().toISOString().slice(0,7), quincena = '1' } = req.query
    const supabase = createAdminClient()

    const getRange = (ym: string, q: number) => {
      const [y, m] = ym.split('-').map(n=>parseInt(n,10))
      const start = new Date(Date.UTC(y, m-1, q===1?1:16))
      const end = new Date(Date.UTC(y, m-1, q===1?16:1))
      if (q===2) { end.setMonth(end.getMonth()+1); } // first day of next month
      return { start: start.toISOString(), end: end.toISOString() }
    }

    const q = parseInt(String(quincena),10)===2?2:1
    const prevMonth = new Date(periodo as string + '-01'); prevMonth.setMonth(prevMonth.getMonth()-1)
    const prevYm = prevMonth.toISOString().slice(0,7)

    const currentRange = getRange(String(periodo), q)
    const prevRange = getRange(prevYm, q)

    const sumForRange = async (range: {start:string; end:string}) => {
      const { data, error } = await supabase
        .from('payroll_records')
        .select('gross_salary, total_deductions, net_salary')
        .gte('period_start', range.start)
        .lt('period_end', range.end)
      if (error) throw new Error(error.message)
      return (data||[]).reduce((acc:any, r:any)=>{
        acc.gross += r.gross_salary||0; acc.net += r.net_salary||0; acc.deductions += r.total_deductions||0; return acc
      }, { gross:0, net:0, deductions:0 })
    }

    const [curr, prev] = await Promise.all([sumForRange(currentRange), sumForRange(prevRange)])
    const delta = {
      gross: curr.gross - prev.gross,
      net: curr.net - prev.net,
      deductions: curr.deductions - prev.deductions,
    }
    return res.status(200).json({ periodo, quincena: q, prev_periodo: prevYm, current: curr, previous: prev, delta })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Internal error' })
  }
}


