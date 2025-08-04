

import { useState, useEffect } from 'react'
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
  const [isClient, setIsClient] = useState(false)
  const [currentTime, setCurrentTime] = useState('')

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Live clock update
  useEffect(() => {
    if (!isClient) return

    const updateTime = () => {
      const now = new Date()
      const tegucigalpaTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Tegucigalpa"}))
      setCurrentTime(tegucigalpaTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'America/Tegucigalpa'
      }))
    }

    updateTime() // Initial call
    const interval = setInterval(updateTime, 1000) // Update every second

    return () => clearInterval(interval)
  }, [isClient])

  // Fetch today's attendance records
  const fetchTodayAttendance = async () => {
    if (!isClient) return
    
    try {
      const response = await fetch('/api/attendance/dashboard-stats')
      if (response.ok) {
        const data = await response.json()
        setAttendanceRecords(data.attendanceRecords || [])
      }
    } catch (error) {
      console.error('Error fetching attendance:', error)
    }
  }

  useEffect(() => {
    if (isClient) {
      fetchTodayAttendance()
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchTodayAttendance, 30000)
      return () => clearInterval(interval)
    }
  }, [isClient])

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

      if (response.ok) {
        setMessage(data.message || 'Asistencia registrada exitosamente')
        setLast5('')
        setJustification('')
        setRequireJustification(false)
        fetchTodayAttendance() // Refresh data
      } else {
        setMessage(data.error || 'Error al registrar asistencia')
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage('Error de conexión')
    } finally {
      setLoading(false)
    }
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
      {/* Attendance Clock-in/out */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Check-in/out</CardTitle>
          <CardDescription>
            Enter the last 5 digits of your DNI to record attendance
          </CardDescription>
          {/* Live Clock Display */}
          <div className="text-center py-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600 font-mono">
              {currentTime || '--:--:--'}
            </div>
            <div className="text-sm text-blue-700 mt-1">
              Tegucigalpa Time
            </div>
          </div>
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

      {/* Today's Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Attendance Records</CardTitle>
          <CardDescription>
            Live view of all attendance records for {new Date().toLocaleDateString()} • Auto-refresh every 30 seconds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Employee</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Check-in</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Check-out</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Late (min)</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Justification</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record, index) => (
                  <tr key={`attendance-${index}`} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-900">{record.employees?.name || 'Unknown'}</div>
                        <div className="text-sm text-gray-500">
                          {record.employees?.employee_code || 'N/A'} • DNI: ****{record.employees?.dni?.slice(-5) || '00000'}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(record.status, record.late_minutes)}
                    </td>
                    <td className="py-3 px-4 font-mono text-sm">
                      {formatTime(record.check_in)}
                    </td>
                    <td className="py-3 px-4 font-mono text-sm">
                      {formatTime(record.check_out)}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {record.late_minutes > 0 ? (
                        <span className="text-red-600 font-medium">{record.late_minutes}m</span>
                      ) : (
                        <span className="text-green-600">0m</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {record.justification ? (
                        <span className="text-sm text-gray-600 italic bg-yellow-50 px-2 py-1 rounded">
                          {record.justification}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {attendanceRecords.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <div className="text-lg font-medium mb-2">No attendance records for today yet</div>
                <div className="text-sm">Employees will appear here once they check in</div>
              </div>
            )}

            {attendanceRecords.length > 0 && (
              <div className="mt-4 text-sm text-gray-500 text-center">
                Showing {attendanceRecords.length} record{attendanceRecords.length !== 1 ? 's' : ''} • 
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
