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
}

interface AttendanceData {
  kpis: AttendanceKPIs
  absent: AttendanceRow[]
  early: AttendanceRow[]
  late: AttendanceRow[]
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

export function useAttendanceData(preset: string, employeeId?: string, role?: string, from?: string, to?: string): AttendanceData {
  const [kpis, setKpis] = useState<AttendanceKPIs>(DEFAULT_KPIS)
  const [absent, setAbsent] = useState<AttendanceRow[]>([])
  const [early, setEarly] = useState<AttendanceRow[]>([])
  const [late, setLate] = useState<AttendanceRow[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const ac = new AbortController()
    const qEmp = employeeId ? `&employee_id=${employeeId}` : ''
    const qRole = role ? `&role=${encodeURIComponent(role)}` : ''
    const qRange = preset === 'custom' && from && to ? `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` : ''
    const q = `?preset=${preset}${qEmp}${qRole}${qRange}`

    try {
      setLoading(true)
      setError(null)

      // Promise.all para cargar todo atómicamente
      // Incluir type=present para mostrar todos los presentes en "Llegadas"
      const [kRes, aRes, eRes, lRes, pRes] = await Promise.all([
        fetch(`/api/attendance/kpis${q}`, { signal: ac.signal }),
        fetch(`/api/attendance/lists${q}&type=absent`, { signal: ac.signal }),
        fetch(`/api/attendance/lists${q}&type=early`, { signal: ac.signal }),
        fetch(`/api/attendance/lists${q}&type=late`, { signal: ac.signal }),
        fetch(`/api/attendance/lists${q}&type=present`, { signal: ac.signal }),
      ])

      // Procesar respuestas
      const [kpiJson, absentJson, earlyJson, lateJson, presentJson] = await Promise.all([
        kRes.ok ? kRes.json() : DEFAULT_KPIS,
        aRes.ok ? aRes.json() : [],
        eRes.ok ? eRes.json() : [],
        lRes.ok ? lRes.json() : [],
        pRes.ok ? pRes.json() : [],
      ])

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
      }
    } finally {
      setLoading(false)
    }

    return () => ac.abort()
  }, [preset, employeeId, role, from, to])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    kpis,
    absent,
    early,
    late,
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
