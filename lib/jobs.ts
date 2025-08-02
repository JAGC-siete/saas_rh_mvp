import { createAdminClient } from './supabase/server'
import logger, { logEvent } from './logger'
import axios from 'axios'

// Tipos para los jobs
export interface JobConfig {
  name: string
  schedule: string // Cron expression
  handler: () => Promise<void>
  timeout?: number // Timeout en ms
  retries?: number
}

export interface JobResult {
  success: boolean
  message: string
  duration: number
  error?: string
  data?: any
}

// Clase para manejar jobs administrativos
export class AdminJobManager {
  private jobs: Map<string, JobConfig> = new Map()
  private isRunning = false

  constructor() {
    this.registerDefaultJobs()
  }

  // Registrar un job
  registerJob(config: JobConfig) {
    this.jobs.set(config.name, config)
    logger.info(`Job registered: ${config.name}`)
  }

  // Ejecutar un job específico
  async executeJob(jobName: string): Promise<JobResult> {
    const job = this.jobs.get(jobName)
    if (!job) {
      throw new Error(`Job not found: ${jobName}`)
    }

    const startTime = Date.now()
    logger.info(`Starting job: ${jobName}`)

    try {
      await job.handler()
      const duration = Date.now() - startTime
      
      const result: JobResult = {
        success: true,
        message: `Job ${jobName} completed successfully`,
        duration,
      }

      logger.info(`Job completed: ${jobName}`, { duration })
      return result

    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      const result: JobResult = {
        success: false,
        message: `Job ${jobName} failed`,
        duration,
        error: errorMessage,
      }

      logger.error(`Job failed: ${jobName}`, { error: errorMessage, duration })
      return result
    }
  }

  // Ejecutar todos los jobs
  async executeAllJobs(): Promise<JobResult[]> {
    const results: JobResult[] = []
    
    for (const [jobName] of this.jobs) {
      try {
        const result = await this.executeJob(jobName)
        results.push(result)
      } catch (error) {
        results.push({
          success: false,
          message: `Failed to execute job: ${jobName}`,
          duration: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return results
  }

  // Registrar jobs por defecto
  private registerDefaultJobs() {
    // Job de limpieza de logs antiguos
    this.registerJob({
      name: 'cleanup-old-logs',
      schedule: '0 2 * * *', // Diario a las 2 AM
      handler: this.cleanupOldLogs.bind(this),
      timeout: 30000, // 30 segundos
    })

    // Job de backup de datos críticos
    this.registerJob({
      name: 'backup-critical-data',
      schedule: '0 3 * * 0', // Semanal los domingos a las 3 AM
      handler: this.backupCriticalData.bind(this),
      timeout: 60000, // 60 segundos
    })

    // Job de verificación de integridad de datos
    this.registerJob({
      name: 'verify-data-integrity',
      schedule: '0 4 * * *', // Diario a las 4 AM
      handler: this.verifyDataIntegrity.bind(this),
      timeout: 45000, // 45 segundos
    })

    // Job de generación de reportes automáticos
    this.registerJob({
      name: 'generate-automatic-reports',
      schedule: '0 6 * * 1', // Semanal los lunes a las 6 AM
      handler: this.generateAutomaticReports.bind(this),
      timeout: 90000, // 90 segundos
    })

    // Job de limpieza de sesiones expiradas
    this.registerJob({
      name: 'cleanup-expired-sessions',
      schedule: '0 1 * * *', // Diario a la 1 AM
      handler: this.cleanupExpiredSessions.bind(this),
      timeout: 30000, // 30 segundos
    })
  }

  // Implementación de jobs específicos
  private async cleanupOldLogs(): Promise<void> {
    logger.info('Starting cleanup of old logs')
    
    // En Vercel, los logs se manejan automáticamente
    // Este job puede ser usado para limpiar logs en Supabase o external services
    const supabase = createAdminClient()
    
    // Limpiar logs de auditoría antiguos (más de 90 días)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    
    const { error } = await supabase
      .from('audit_logs')
      .delete()
      .lt('created_at', ninetyDaysAgo.toISOString())
    
    if (error) {
      throw new Error(`Failed to cleanup old logs: ${error.message}`)
    }
    
    logger.info('Cleanup of old logs completed')
  }

  private async backupCriticalData(): Promise<void> {
    logger.info('Starting backup of critical data')
    
    const supabase = createAdminClient()
    
    // Backup de empleados
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
    
    if (employeesError) {
      throw new Error(`Failed to backup employees: ${employeesError.message}`)
    }
    
    // Backup de compañías
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
    
    if (companiesError) {
      throw new Error(`Failed to backup companies: ${companiesError.message}`)
    }
    
    // Guardar backup en una tabla de backups
    const backupData = {
      employees,
      companies,
      backup_date: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
    }
    
    const { error: backupError } = await supabase
      .from('data_backups')
      .insert([backupData])
    
    if (backupError) {
      throw new Error(`Failed to save backup: ${backupError.message}`)
    }
    
    logger.info('Backup of critical data completed', { 
      employeesCount: employees?.length || 0,
      companiesCount: companies?.length || 0 
    })
  }

  private async verifyDataIntegrity(): Promise<void> {
    logger.info('Starting data integrity verification')
    
    const supabase = createAdminClient()
    
    // Verificar empleados sin compañía
    const { data: orphanEmployees, error: orphanError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, company_id')
      .is('company_id', null)
    
    if (orphanError) {
      throw new Error(`Failed to check orphan employees: ${orphanError.message}`)
    }
    
    // Verificar asistencias sin empleado
    const { data: orphanAttendance, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('id, employee_id')
      .not('employee_id', 'in', `(select id from employees)`)
    
    if (attendanceError) {
      throw new Error(`Failed to check orphan attendance: ${attendanceError.message}`)
    }
    
    if (orphanEmployees && orphanEmployees.length > 0) {
      logger.warn('Found orphan employees', { count: orphanEmployees.length })
    }
    
    if (orphanAttendance && orphanAttendance.length > 0) {
      logger.warn('Found orphan attendance records', { count: orphanAttendance.length })
    }
    
    logger.info('Data integrity verification completed')
  }

  private async generateAutomaticReports(): Promise<void> {
    logger.info('Starting automatic report generation')
    
    const supabase = createAdminClient()
    
    // Generar reporte semanal de asistencia
    const lastWeek = new Date()
    lastWeek.setDate(lastWeek.getDate() - 7)
    
    const { data: weeklyAttendance, error: attendanceError } = await supabase
      .from('attendance_records')
      .select(`
        *,
        employees(first_name, last_name, company_id),
        companies(name)
      `)
      .gte('check_in_time', lastWeek.toISOString())
    
    if (attendanceError) {
      throw new Error(`Failed to generate weekly report: ${attendanceError.message}`)
    }
    
    // Guardar reporte generado
    const reportData = {
      type: 'weekly_attendance',
      generated_at: new Date().toISOString(),
      data: weeklyAttendance,
      summary: {
        total_records: weeklyAttendance?.length || 0,
        period_start: lastWeek.toISOString(),
        period_end: new Date().toISOString(),
      }
    }
    
    const { error: reportError } = await supabase
      .from('generated_reports')
      .insert([reportData])
    
    if (reportError) {
      throw new Error(`Failed to save report: ${reportError.message}`)
    }
    
    logger.info('Automatic report generation completed', { 
      recordsProcessed: weeklyAttendance?.length || 0 
    })
  }

  private async cleanupExpiredSessions(): Promise<void> {
    logger.info('Starting cleanup of expired sessions')
    
    const supabase = createAdminClient()
    
    // Limpiar sesiones expiradas (más de 24 horas)
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)
    
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .lt('last_activity', twentyFourHoursAgo.toISOString())
    
    if (error) {
      throw new Error(`Failed to cleanup expired sessions: ${error.message}`)
    }
    
    logger.info('Cleanup of expired sessions completed')
  }
}

// Instancia global del job manager
export const jobManager = new AdminJobManager()

// Función para ejecutar jobs desde Vercel Cron
export async function executeScheduledJob(jobName: string): Promise<JobResult> {
  return await jobManager.executeJob(jobName)
}

// Función para ejecutar todos los jobs
export async function executeAllScheduledJobs(): Promise<JobResult[]> {
  return await jobManager.executeAllJobs()
} 