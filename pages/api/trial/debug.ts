import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

/**
 * Debug API para verificar qué está pasando con el filtrado del trial
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { tenant } = req.query

    if (!tenant || typeof tenant !== 'string') {
      return res.status(400).json({ error: 'Tenant requerido' })
    }

    const supabase = createAdminClient()

    // 1. Verificar qué empresas existen
    const { data: allCompanies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, subdomain')
      .order('name')

    if (companiesError) {
      return res.status(500).json({ error: 'Error obteniendo empresas', details: companiesError })
    }

    // Buscar empresa demo por UUID específico
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, subdomain')
      .eq('id', 'c0f49c93-f9a6-40df-b3bd-422963c50e28')
      .eq('is_active', true)
      .single()

    // 3. Verificar empleados de TODAS las empresas (para debug)
    const { data: allEmployees, error: employeesError } = await supabase
      .from('employees')
      .select('id, name, company_id, status')
      .eq('status', 'active')
      .order('name')

    if (employeesError) {
      return res.status(500).json({ error: 'Error obteniendo empleados', details: employeesError })
    }

    // 4. Si encontramos la empresa demo, verificar sus empleados
    let trialEmployees: any[] = []
    if (company) {
      const { data: trialEmp, error: trialEmpError } = await supabase
        .from('employees')
        .select('id, name, company_id, status, base_salary')
        .eq('company_id', company.id)
        .eq('status', 'active')
        .order('name')

      if (!trialEmpError) {
        trialEmployees = trialEmp || []
      }
    }

    // 5. Verificar si hay empleados de Paragon
    const paragonEmployees = allEmployees?.filter((e: any) => {
      const company = allCompanies?.find((c: any) => c.id === e.company_id)
      return company?.name?.toLowerCase().includes('paragon')
    }) || []

    const debugInfo = {
      requestedTenant: tenant,
      allCompanies: allCompanies || [],
      targetCompany: company || null,
      targetCompanyError: companyError,
      totalActiveEmployees: allEmployees?.length || 0,
      trialCompanyEmployees: trialEmployees,
      paragonEmployees: paragonEmployees,
      debugMessage: company 
        ? `✅ Encontrada empresa: ${company.name} (ID: ${company.id}) con ${trialEmployees.length} empleados`
        : `❌ NO se encontró empresa para tenant: ${tenant}`
    }

    return res.status(200).json(debugInfo)
  } catch (error) {
    console.error('💥 Error en debug API:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
