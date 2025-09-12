import AttendanceRegister from '../../components/AttendanceRegister'

export default function AttendanceRegisterPage() {
  return (
    <AttendanceRegister 
      variant="public"
      showBackground={true}
      showAdminLink={true}
      showHeader={true}
    />
  )
}
