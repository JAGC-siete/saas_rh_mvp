

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

interface AttendanceRecord {
  id: string
  employee_id: string
  date: string
  check_in: string | null
  check_out: string | null
  late_minutes: number
  early_departure_minutes: number
  justification: string | null
  status: string
  employees: {
    name: string
    employee_code: string
    dni: string
  }
}

export default function AttendanceManager() {
  const [last5, setLast5] = useState('')
  const [justification, setJustification] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [requireJustification, setRequireJustification] = useState(false)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [currentEmployee, setCurrentEmployee] = useState<any>(null)
  const [gamificationData, setGamificationData] = useState<any>(null)

  // Fetch today's attendance records
  const fetchTodayAttendance = async () => {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        *,
        employees:employee_id (
          name,
          employee_code,
          dni
        )
      `)
      .eq('date', today)
      .order('check_in', { ascending: false })

    if (error) {
      console.error('Error fetching attendance:', error)
    } else {
      setAttendanceRecords(data || [])
    }
  }

  // Fetch gamification data for current user
  const fetchGamificationData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user profile to find employee_id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('employee_id, company_id')
        .eq('id', user.id)
        .single()

      if (!profile?.employee_id) return

      // Get employee scores
      const { data: scores } = await supabase
        .from('employee_scores')
        .select('*')
        .eq('employee_id', profile.employee_id)
        .single()

      // Get recent achievements
      const { data: achievements } = await supabase
        .from('employee_achievements')
        .select(`
          *,
          achievement_types(name, description, icon, badge_color)
        `)
        .eq('employee_id', profile.employee_id)
        .order('earned_at', { ascending: false })
        .limit(3)

      // Get recent point history
      const { data: pointHistory } = await supabase
        .from('point_history')
        .select('*')
        .eq('employee_id', profile.employee_id)
        .order('created_at', { ascending: false })
        .limit(5)

      setGamificationData({
        scores: scores || { total_points: 0, weekly_points: 0, monthly_points: 0 },
        achievements: achievements || [],
        pointHistory: pointHistory || []
      })
    } catch (error) {
      console.error('Error fetching gamification data:', error)
    }
  }

  useEffect(() => {
    fetchTodayAttendance()
    fetchGamificationData()

    // Set up real-time subscription
    const subscription = supabase
      .channel('attendance_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'attendance_records' },
        (payload: any) => {
          fetchTodayAttendance() // Refresh data on any change
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleAttendance = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          last5,
          justification: requireJustification ? justification : undefined,
        }),
      })

      const data = await response.json()

      if (response.status === 422 && data.requireJustification) {
        setRequireJustification(true)
        setMessage(data.message)
        return
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record attendance')
      }

      setMessage(data.message)
      setLast5('')
      setJustification('')
      setRequireJustification(false)
      fetchTodayAttendance() // Refresh the list

    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
    }

    setLoading(false)
  }

  const handleJustificationSubmit = async () => {
    if (!justification.trim()) {
      setMessage('Please provide a justification.')
      return
    }
    
    await handleAttendance(new Event('submit') as any)
  }

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const getStatusBadge = (status: string, lateMinutes: number) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium'
    
    switch (status) {
      case 'present':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Present</span>
      case 'late':
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Late ({lateMinutes}m)</span>
      case 'absent':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Absent</span>
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>{status}</span>
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Clock-in/out */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Check-in/out</CardTitle>
            <CardDescription>
              Enter the last 5 digits of your DNI to record attendance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAttendance} className="space-y-4">
              <div>
                <label htmlFor="last5" className="block text-sm font-medium text-gray-700 mb-1">
                  Last 5 digits of DNI
                </label>
                <Input
                  id="last5"
                  type="text"
                  maxLength={5}
                  pattern="[0-9]{5}"
                  value={last5}
                  onChange={(e) => setLast5(e.target.value)}
                  placeholder="12345"
                  className="text-center text-lg font-mono"
                  required
                />
              </div>

              {requireJustification && (
                <div>
                  <label htmlFor="justification" className="block text-sm font-medium text-gray-700 mb-1">
                    Justification for being late
                  </label>
                  <textarea
                    id="justification"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Please explain why you're late..."
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    required
                  />
                  <Button
                    type="button"
                    onClick={handleJustificationSubmit}
                    disabled={loading}
                    className="mt-2 w-full"
                  >
                    Submit Justification
                  </Button>
                </div>
              )}

              {!requireJustification && (
                <Button
                  type="submit"
                  disabled={loading || last5.length !== 5}
                  className="w-full"
                >
                  {loading ? 'Processing...' : 'Record Attendance'}
                </Button>
              )}

              {message && (
                <div className={`p-3 rounded-md text-sm ${
                  message.includes('Error') 
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  {message}
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Summary</CardTitle>
            <CardDescription>Real-time attendance overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {attendanceRecords.filter(r => r.status === 'present').length}
                </div>
                <div className="text-sm text-green-700">Present</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {attendanceRecords.filter(r => r.late_minutes > 0).length}
                </div>
                <div className="text-sm text-yellow-700">Late</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gamification Card */}
        {gamificationData && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>🏆 Tu Progreso</CardTitle>
              <CardDescription>Puntos y logros de asistencia</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Points Summary */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Puntuación</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total:</span>
                      <span className="font-mono font-bold text-blue-600">
                        {gamificationData.scores.total_points} pts
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Esta semana:</span>
                      <span className="font-mono font-bold text-green-600">
                        {gamificationData.scores.weekly_points} pts
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Este mes:</span>
                      <span className="font-mono font-bold text-purple-600">
                        {gamificationData.scores.monthly_points} pts
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Achievements */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Logros Recientes</h3>
                  {gamificationData.achievements.length > 0 ? (
                    <div className="space-y-2">
                      {gamificationData.achievements.map((achievement: any, index: number) => (
                        <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                          <span className="text-lg">{achievement.achievement_types.icon}</span>
                          <div className="flex-1">
                            <div className="text-sm font-medium">{achievement.achievement_types.name}</div>
                            <div className="text-xs text-gray-500">+{achievement.points_earned} pts</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      Aún no tienes logros. ¡Mantén la puntualidad!
                    </div>
                  )}
                </div>

                {/* Recent Activity */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Actividad Reciente</h3>
                  {gamificationData.pointHistory.length > 0 ? (
                    <div className="space-y-2">
                      {gamificationData.pointHistory.slice(0, 3).map((record: any, index: number) => (
                        <div key={index} className="text-sm">
                          <div className="font-medium text-gray-900">+{record.points_earned} pts</div>
                          <div className="text-xs text-gray-500">{record.reason}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      No hay actividad reciente
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
                  {attendanceRecords.filter(r => r.status === 'late').length}
                </div>
                <div className="text-sm text-yellow-700">Late</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {attendanceRecords.filter(r => r.check_in && r.check_out).length}
                </div>
                <div className="text-sm text-blue-700">Completed</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {attendanceRecords.length}
                </div>
                <div className="text-sm text-gray-700">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Attendance Records</CardTitle>
          <CardDescription>
            Live view of all attendance records for {new Date().toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Employee</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Check-in</th>
                  <th className="text-left py-3 px-4">Check-out</th>
                  <th className="text-left py-3 px-4">Justification</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record, index) => (
                  <tr key={`attendance-${index}`} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{record.employees?.name}</div>
                        <div className="text-sm text-gray-500">
                          {record.employees?.employee_code} • DNI: ****{record.employees?.dni?.slice(-5)}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(record.status, record.late_minutes)}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {formatTime(record.check_in)}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {formatTime(record.check_out)}
                    </td>
                    <td className="py-3 px-4">
                      {record.justification ? (
                        <span className="text-sm text-gray-600 italic">
                          {record.justification}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {attendanceRecords.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No attendance records for today yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
