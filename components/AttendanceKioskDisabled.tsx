export default function AttendanceKioskDisabled() {
  return (
    <main
      style={{
        minHeight: '100vh',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0b1220',
        color: '#f8fafc',
        fontFamily: 'system-ui, sans-serif',
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: '0 0 12px' }}>
          Kiosco deshabilitado
        </h1>
        <p style={{ margin: 0, color: 'rgba(248,250,252,0.7)', lineHeight: 1.5 }}>
          El registro público por DNI o últimos 5 dígitos no está disponible.
        </p>
      </div>
    </main>
  )
}
