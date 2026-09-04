import Head from 'next/head'
import AttendanceKioskDisabled from '../../components/AttendanceKioskDisabled'

export default function AttendanceRegisterPage() {
  return (
    <>
      <Head>
        <title>Kiosco deshabilitado | Humano SISU</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <AttendanceKioskDisabled />
    </>
  )
}
