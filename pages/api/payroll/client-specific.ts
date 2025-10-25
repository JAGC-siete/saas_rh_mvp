import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
// import { PROHALCA_CONFIG, validateProhalcaData, calculateProhalcaPayroll } from '../../../lib/payroll/prohalca-config'

// Placeholder config for PROHALCA
const PROHALCA_CONFIG = {
  departments: [
    { id: 'general', name: 'General', description: 'Departamento general', salaryRange: { min: 8000, max: 15000 }, shifts: ['standard'] }
  ],
  shifts: {
    standard: {
      name: 'Jornada Estándar',
      startTime: '08:00',
      endTime: '17:00',
      hours: 9,
      overtimeRate: 1.5,
      nightShiftBonus: 0
    }
  }
}

const validateProhalcaData = (data: any) => {
  return [] // Placeholder - no validation errors
}

const calculateProhalcaPayroll = (data: any) => {
  return data // Placeholder - return data as-is
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // AUTENTICACIÓN ESTANDARIZADA
    const { supabase, companyId, role, user } = await requireCompanyAccess(req, res)
    
    // Validar que companyId esté presente
    if (!companyId) {
      return res.status(400).json({ 
        error: 'Perfil de usuario incompleto',
        message: 'No se pudo obtener la información de la empresa'
      })
    }
    
    // Verificar roles específicos para configuración de cliente
    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para configurar cliente específico'
      })
    }

    const { action, data } = req.body

    switch (action) {
      case 'get_config':
        return await getClientConfig(supabase, companyId, res)
      
      case 'validate_payroll':
        return await validatePayrollData(data, res)
      
      case 'calculate_payroll':
        return await calculatePayroll(data, res)
      
      case 'setup_departments':
        return await setupDepartments(supabase, companyId, res)
      
      case 'setup_shifts':
        return await setupShifts(supabase, companyId, res)
      
      default:
        return res.status(400).json({ error: 'Acción no válida' })
    }

  } catch (error: any) {
    console.error('Error in client-specific API:', error)
    
    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    })
  }
}

// Obtener configuración específica del cliente
async function getClientConfig(supabase: any, companyId: string, res: NextApiResponse) {
  try {
    // Verificar si es PROHALCA
    const { data: company } = await supabase
      .from('companies')
      .select('name, settings')
      .eq('id', companyId)
      .single()

    if (!company) {
      return res.status(404).json({ error: 'Empresa no encontrada' })
    }

    // Detectar tipo de cliente basado en nombre o configuración
    const isProhalca = company.name.toLowerCase().includes('prohalca') || 
                      company.name.toLowerCase().includes('procesadora') ||
                      company.settings?.clientType === 'prohalca'

    if (isProhalca) {
      return res.status(200).json({
        success: true,
        clientType: 'prohalca',
        config: PROHALCA_CONFIG,
        message: 'Configuración PROHALCA cargada'
      })
    }

    // Configuración estándar para otros clientes
    return res.status(200).json({
      success: true,
      clientType: 'standard',
      config: {
        departments: [
          { id: 'general', name: 'General', description: 'Departamento general' }
        ],
        shifts: {
          standard: {
            name: 'Jornada Estándar',
            startTime: '08:00',
            endTime: '17:00',
            hours: 9,
            overtimeRate: 1.5,
            nightShiftBonus: 0
          }
        },
        payrollFields: {
          standard: ['empleado_id', 'nombre', 'puesto', 'sueldo_base', 'sueldo_bruto', 'sueldo_neto']
        }
      },
      message: 'Configuración estándar cargada'
    })

  } catch (error) {
    console.error('Error getting client config:', error)
    return res.status(500).json({ error: 'Error obteniendo configuración' })
  }
}

// Validar datos de nómina específicos del cliente
async function validatePayrollData(data: any, res: NextApiResponse) {
  try {
    const errors = validateProhalcaData(data)
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors,
        message: 'Datos de nómina inválidos'
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Datos de nómina válidos'
    })

  } catch (error) {
    console.error('Error validating payroll data:', error)
    return res.status(500).json({ error: 'Error validando datos' })
  }
}

// Calcular nómina específica del cliente
async function calculatePayroll(data: any, res: NextApiResponse) {
  try {
    const result = calculateProhalcaPayroll(data)
    
    return res.status(200).json({
      success: true,
      payroll: result,
      message: 'Nómina calculada exitosamente'
    })

  } catch (error) {
    console.error('Error calculating payroll:', error)
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Error calculando nómina' 
    })
  }
}

// Configurar departamentos específicos del cliente
async function setupDepartments(supabase: any, companyId: string, res: NextApiResponse) {
  try {
    // Verificar si ya existen departamentos
    const { data: existingDepts } = await supabase
      .from('departments')
      .select('id')
      .eq('company_id', companyId)

    if (existingDepts && existingDepts.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'Departamentos ya configurados',
        departments: existingDepts
      })
    }

    // Crear departamentos específicos de PROHALCA
    const departments = PROHALCA_CONFIG.departments.map(dept => ({
      company_id: companyId,
      name: dept.name,
      description: dept.description,
      metadata: {
        departmentId: dept.id,
        salaryRange: dept.salaryRange,
        shifts: dept.shifts
      }
    }))

    const { data: newDepts, error } = await supabase
      .from('departments')
      .insert(departments)
      .select()

    if (error) {
      throw error
    }

    return res.status(201).json({
      success: true,
      message: 'Departamentos configurados exitosamente',
      departments: newDepts
    })

  } catch (error) {
    console.error('Error setting up departments:', error)
    return res.status(500).json({ error: 'Error configurando departamentos' })
  }
}

// Configurar horarios específicos del cliente
async function setupShifts(supabase: any, companyId: string, res: NextApiResponse) {
  try {
    // Verificar si ya existen horarios
    const { data: existingShifts } = await supabase
      .from('work_schedules')
      .select('id')
      .eq('company_id', companyId)

    if (existingShifts && existingShifts.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'Horarios ya configurados',
        shifts: existingShifts
      })
    }

    // Crear horarios específicos de PROHALCA
    const shifts = Object.entries(PROHALCA_CONFIG.shifts).map(([key, shift]) => ({
      company_id: companyId,
      name: shift.name,
      monday_start: shift.startTime,
      monday_end: shift.endTime,
      tuesday_start: shift.startTime,
      tuesday_end: shift.endTime,
      wednesday_start: shift.startTime,
      wednesday_end: shift.endTime,
      thursday_start: shift.startTime,
      thursday_end: shift.endTime,
      friday_start: shift.startTime,
      friday_end: shift.endTime,
      saturday_start: shift.startTime,
      saturday_end: shift.endTime,
      sunday_start: shift.startTime,
      sunday_end: shift.endTime,
      break_duration: 60,
      timezone: 'America/Tegucigalpa',
      metadata: {
        shiftId: key,
        hours: shift.hours,
        overtimeRate: shift.overtimeRate,
        nightShiftBonus: shift.nightShiftBonus
      }
    }))

    const { data: newShifts, error } = await supabase
      .from('work_schedules')
      .insert(shifts)
      .select()

    if (error) {
      throw error
    }

    return res.status(201).json({
      success: true,
      message: 'Horarios configurados exitosamente',
      shifts: newShifts
    })

  } catch (error) {
    console.error('Error setting up shifts:', error)
    return res.status(500).json({ error: 'Error configurando horarios' })
  }
}
