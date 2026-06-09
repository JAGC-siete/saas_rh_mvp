import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdmin } from '../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../lib/supabase/server'

type ActivityType = 'company_created' | 'user_registered' | 'employee_registered' | 'payment_recorded'

interface RecentActivityItem {
  id: string
  type: ActivityType
  message: string
  timestamp: string
  severity: 'info' | 'warning' | 'error'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await requireSuperAdmin(req, res)
    const supabase = createAdminClient()

    const [companiesResult, usersResult, employeesResult, paymentsResult] = await Promise.all([
      supabase
        .from('companies')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('user_profiles')
        .select('id, role, created_at')
        .in('role', ['super_admin', 'company_admin'])
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('employees')
        .select('id, name, created_at, status')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('manual_payments')
        .select('id, amount_hnl, paid_at, companies(name)')
        .order('paid_at', { ascending: false })
        .limit(5),
    ])

    const activities: RecentActivityItem[] = []

    for (const company of companiesResult.data || []) {
      activities.push({
        id: `company_${company.id}`,
        type: 'company_created',
        message: `Nueva empresa creada: ${company.name}`,
        timestamp: company.created_at,
        severity: 'info',
      })
    }

    for (const user of usersResult.data || []) {
      activities.push({
        id: `user_${user.id}`,
        type: 'user_registered',
        message: `Nuevo usuario admin: ${user.role}`,
        timestamp: user.created_at,
        severity: 'info',
      })
    }

    for (const employee of employeesResult.data || []) {
      activities.push({
        id: `employee_${employee.id}`,
        type: 'employee_registered',
        message: `Nuevo empleado: ${employee.name} (${employee.status || 'sin estado'})`,
        timestamp: employee.created_at,
        severity: 'info',
      })
    }

    for (const payment of paymentsResult.data || []) {
      const companyName = (payment as any).companies?.name || 'empresa'
      const amount = Number(payment.amount_hnl || 0).toLocaleString('es-HN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      activities.push({
        id: `payment_${payment.id}`,
        type: 'payment_recorded',
        message: `Pago registrado: L. ${amount} — ${companyName}`,
        timestamp: payment.paid_at,
        severity: 'info',
      })
    }

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    res.status(200).json({ activities: activities.slice(0, 10) })
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return
    }
    console.error('Error fetching recent activity:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
