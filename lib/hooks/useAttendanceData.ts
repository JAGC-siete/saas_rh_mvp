import { useState, useEffect, useCallback } from 'react'

interface AttendanceKPIs {
  presentes: number
  ausentes: number
  tempranos: number
  tardes: number
  total_empleados?: number
}

interface AttendanceRow {
  id: string
  name: string
  dni: string
  employee_code?: string
  role?: string
  check_in_time?: string
  check_out?: string
  delta_min?: number
  late_minutes?: number
  status?: string
  date?: string
  team?: string
  flags?: { horario_no_detectado?: boolean; razon?: string; gap_minutos?: number }
}

interface AttendanceData {
  kpis: AttendanceKPIs
  absent: AttendanceRow[]
  early: AttendanceRow[]
  late: AttendanceRow[]
  outsideSchedule: AttendanceRow[]
  lastUpdated: Date | null
  loading: boolean
  error: string | null
}

const DEFAULT_KPIS: AttendanceKPIs = { 
  presentes: 0, 
  ausentes: 0, 
  tempranos: 0, 
  tardes: 0,
  total_empleados: 0
}

const MAX_RANGE_DAYS = 366

function isRangeValid(from?: string, to?: string): boolean {
  if (!from || !to) return false
  const fromDate = from.slice(0, 10)
  const toDate = to.slice(0, 10)
  if (fromDate > toDate) return false
  const fromMs = new Date(fromDate).getTime()
  const toMs = new Date(toDate).getTime()
  const diffDays = Math.ceil((toMs - fromMs) / (24 * 60 * 60 * 1000))
  return diffDays <= MAX_RANGE_DAYS
}

export function useAttendanceData(preset: string, employeeId?: string, role?: string, from?: string, to?: string, departmentId?: string): AttendanceData {
  const [kpis, setKpis] = useState<AttendanceKPIs>(DEFAULT_KPIS)
  const [absent, setAbsent] = useState<AttendanceRow[]>([])
  const [early, setEarly] = useState<AttendanceRow[]>([])
  const [late, setLate] = useState<AttendanceRow[]>([])
  const [outsideSchedule, setOutsideSchedule] = useState<AttendanceRow[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (preset === 'custom' && !isRangeValid(from, to)) {
      setLoading(false)
      return
    }
    const ac = new AbortController()
    const qEmp = employeeId ? `&employee_id=${employeeId}` : ''
    const qRole = role ? `&role=${encodeURIComponent(role)}` : ''
    const qDept = departmentId ? `&department_id=${encodeURIComponent(departmentId)}` : ''
    const qRange = preset === 'custom' && from && to ? `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` : ''
    const q = `?preset=${preset}${qEmp}${qRole}${qDept}${qRange}`

    try {
      setLoading(true)
      setError(null)

      const fetchOpts = { signal: ac.signal, credentials: 'include' as RequestCredentials }
      // Promise.all para cargar todo atómicamente
      // Incluir type=present para mostrar todos los presentes en "Llegadas"
      // Incluir type=outside_schedule para empleados que marcaron fuera de horario (Capa Base)
      const [kRes, aRes, eRes, lRes, pRes, oRes] = await Promise.all([
        fetch(`/api/attendance/kpis${q}`, fetchOpts),
        fetch(`/api/attendance/lists${q}&type=absent`, fetchOpts),
        fetch(`/api/attendance/lists${q}&type=early`, fetchOpts),
        fetch(`/api/attendance/lists${q}&type=late`, fetchOpts),
        fetch(`/api/attendance/lists${q}&type=present`, fetchOpts),
        fetch(`/api/attendance/lists${q}&type=outside_schedule`, fetchOpts),
      ])

      // Procesar respuestas; si alguna list falla, capturar mensaje para no mostrar solo "No hay registros"
      const listResponses = [aRes, eRes, lRes, pRes, oRes] as const
      const listBodies = await Promise.all(listResponses.map((r) => r.json().catch(() => ({}))))
      const absentJson = aRes.ok && Array.isArray(listBodies[0]) ? listBodies[0] : []
      const earlyJson = eRes.ok && Array.isArray(listBodies[1]) ? listBodies[1] : []
      const lateJson = lRes.ok && Array.isArray(listBodies[2]) ? listBodies[2] : []
      const presentJson = pRes.ok && Array.isArray(listBodies[3]) ? listBodies[3] : []
      const outsideScheduleJson = oRes.ok && Array.isArray(listBodies[4]) ? listBodies[4] : []

      const kpiJson = kRes.ok ? await kRes.json() : DEFAULT_KPIS

      const failedList = listResponses.find((r) => !r.ok)
      if (failedList) {
        const idx = listResponses.indexOf(failedList)
        const body = listBodies[idx] as { error?: string; message?: string }
        setError(
          typeof body?.error === 'string' ? body.error : typeof body?.message === 'string' ? body.message : `Error listas (${failedList.status})`
        )
      }

      // Combinar early, late y present para "Llegadas"
      // Filtrar present para excluir los que ya están en early o late
      const presentIds = new Set([
        ...(Array.isArray(earlyJson) ? earlyJson.map((r: any) => r.id) : []),
        ...(Array.isArray(lateJson) ? lateJson.map((r: any) => r.id) : []),
      ]);
      
      const presentOnly = Array.isArray(presentJson) 
        ? presentJson.filter((r: any) => !presentIds.has(r.id))
        : [];

      // Commit único para evitar renders múltiples
      setKpis(kpiJson ?? DEFAULT_KPIS)
      setAbsent(Array.isArray(absentJson) ? absentJson : [])
      // Combinar early + late + present (solo los que no están en early/late)
      setEarly(Array.isArray(earlyJson) ? earlyJson : [])
      setLate([
        ...(Array.isArray(lateJson) ? lateJson : []),
        ...presentOnly, // Agregar presentes que no son early ni late (a tiempo)
      ])
      setOutsideSchedule(Array.isArray(outsideScheduleJson) ? outsideScheduleJson : [])
      setLastUpdated(new Date())

    } catch (err) {
      // Solo manejar errores que no sean AbortError
      if ((err as any).name !== 'AbortError') {
        console.error('Error fetching attendance data:', err)
        setError('Error al cargar datos de asistencia')
        setKpis(DEFAULT_KPIS)
        setAbsent([])
        setEarly([])
        setLate([])
        setOutsideSchedule([])
      }
    } finally {
      setLoading(false)
    }

    return () => ac.abort()
  }, [preset, employeeId, role, from, to, departmentId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    kpis,
    absent,
    early,
    late,
    outsideSchedule,
    lastUpdated,
    loading,
    error
  }
}

// Utilidad para calcular tasas derivadas
export function calculateAttendanceRates(kpis: AttendanceKPIs) {
  const total = (kpis.presentes ?? 0) + (kpis.tardes ?? 0) + (kpis.ausentes ?? 0)
  const asistenciaPct = total > 0 ? (((kpis.presentes ?? 0) + (kpis.tardes ?? 0)) / total) * 100 : 0
  const puntualidadPct = total > 0 ? ((kpis.presentes ?? 0) / total) * 100 : 0
  
  return {
    total,
    asistenciaPct: Math.round(asistenciaPct * 10) / 10, // 1 decimal
    puntualidadPct: Math.round(puntualidadPct * 10) / 10
  }
}

// Utilidad para determinar severidad de llegadas
export function getSeverityFromDelta(delta: number) {
  if (delta <= -5) return { label: 'Temprano', tone: 'info', color: 'text-blue-400', bgColor: 'bg-blue-500/20' }
  if (delta < 5) return { label: 'A tiempo', tone: 'ok', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' }
  if (delta <= 10) return { label: 'Tarde 5–10', tone: 'warn', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' }
  if (delta <= 20) return { label: 'Tarde 11–20', tone: 'alert', color: 'text-orange-400', bgColor: 'bg-orange-500/20' }
  return { label: 'Tarde >20', tone: 'danger', color: 'text-red-400', bgColor: 'bg-red-500/20' }
}
