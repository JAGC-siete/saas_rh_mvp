

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

export default function AttendanceManager() {
  const [last5, setLast5] = useState('')
  const [justification, setJustification] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [requireJustification, setRequireJustification] = useState(false)
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
    </div>
  )
}
