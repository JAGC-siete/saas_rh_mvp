import ProtectedRoute from '../components/ProtectedRoute'
import ModernAttendanceManager from '../components/ModernAttendanceManager'

export default function Attendance() {
  return (
    <ProtectedRoute>
      <ModernAttendanceManager />
    </ProtectedRoute>
  )
}
