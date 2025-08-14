interface ExportButtonProps {
  onExport: (format: string) => Promise<void>
}

export default function ExportButton({ onExport }: ExportButtonProps) {
  const handleExport = (format: string) => {
    onExport(format)
  }

  return (
    <div className="flex gap-2">
      {['csv','xlsx','pdf'].map(f => (
        <button key={f} onClick={() => handleExport(f)} className="bg-gray-800 text-white rounded px-3 py-2 text-sm">
          Export {f.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
