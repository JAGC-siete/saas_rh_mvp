import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdmin } from '../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verificar que el usuario sea super_admin
    const { role } = await requireSuperAdmin(req, res)
    
    // Use admin client to bypass RLS for super admin queries
    const supabase = createAdminClient()

    // Obtener estadísticas del sistema
    const [
      companiesResult,
      usersResult,
      employeesResult,
      revenueResult
    ] = await Promise.all([
      // Total de empresas
      supabase
        .from('companies')
        .select('id, is_active, created_at')
        .order('created_at', { ascending: false }),
      
      // Total de usuarios admin
      supabase
        .from('user_profiles')
        .select('id, role, is_active, created_at')
        .in('role', ['super_admin', 'company_admin', 'hr_manager']),
      
      // Total de empleados
      supabase
        .from('employees')
        .select('id, is_active, created_at'),
      
      // Ingresos (simulado - en una implementación real vendría de una tabla de billing)
      supabase
        .from('companies')
        .select('plan_type, created_at')
        .eq('is_active', true)
    ])

    // Procesar datos de empresas
    const companies = companiesResult.data || []
    const totalCompanies = companies.length
    const activeCompanies = companies.filter((c: any) => c.is_active).length
    const inactiveCompanies = totalCompanies - activeCompanies

    // Procesar datos de usuarios
    const users = usersResult.data || []
    const totalUsers = users.filter((u: any) => u.is_active).length

    // Procesar datos de empleados
    const employees = employeesResult.data || []
    const totalEmployees = employees.filter((e: any) => e.is_active).length

    // Calcular ingresos simulados
    const revenueData = revenueResult.data || []
    const monthlyRevenue = revenueData
      .filter((c: any) => {
        const createdDate = new Date(c.created_at)
        const currentDate = new Date()
        const monthAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, currentDate.getDate())
        return createdDate >= monthAgo
      })
      .reduce((total: number, company: any) => {
        // Simular precios por plan
        const planPrices: { [key: string]: number } = {
          'basic': 500,
          'premium': 1000,
          'enterprise': 2000
        }
        return total + (planPrices[company.plan_type] || 500)
      }, 0)

    const totalRevenue = revenueData.reduce((total: number, company: any) => {
      const planPrices: { [key: string]: number } = {
        'basic': 500,
        'premium': 1000,
        'enterprise': 2000
      }
      return total + (planPrices[company.plan_type] || 500)
    }, 0)

    // Estado del sistema (simulado)
    const systemHealth = activeCompanies > 0 && totalEmployees > 0 ? 'healthy' : 
                        totalCompanies > 0 ? 'warning' : 'critical'

    // Información del servidor (simulada)
    const lastBackup = new Date().toISOString().split('T')[0]
    const serverUptime = `${Math.floor(Math.random() * 99) + 1}d ${Math.floor(Math.random() * 23) + 1}h`

    const stats = {
      totalCompanies,
      totalUsers,
      totalEmployees,
      activeCompanies,
      inactiveCompanies,
      totalRevenue,
      monthlyRevenue,
      systemHealth,
      lastBackup,
      serverUptime
    }

    res.status(200).json({ stats })

  } catch (error) {
    console.error('Error fetching admin stats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
