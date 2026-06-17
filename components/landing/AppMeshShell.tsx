import { type ReactNode } from 'react'
import { cn } from '../../lib/utils'
import MeshBackground from './MeshBackground'

interface AppMeshShellProps {
  children: ReactNode
  className?: string
}

/** Atmósfera compartida (mesh + profundidad) para layouts autenticados /app. */
export default function AppMeshShell({ children, className }: AppMeshShellProps) {
  return (
    <div className={cn('min-h-screen flex overflow-hidden bg-mesh text-white relative isolate', className)}>
      <MeshBackground />
      {children}
    </div>
  )
}
