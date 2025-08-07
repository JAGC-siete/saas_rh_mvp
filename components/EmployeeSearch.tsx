import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

interface EmployeeSearchProps {
  searchTerm: string
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function EmployeeSearch({ searchTerm, onSearchChange }: EmployeeSearchProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Búsqueda de Empleados</CardTitle>
        <CardDescription>Encuentra empleados por nombre, código, DNI o posición.</CardDescription>
      </CardHeader>
      <CardContent>
        <Input
          type="text"
          placeholder="Buscar empleados..."
          value={searchTerm}
          onChange={onSearchChange}
          className="max-w-md"
        />
      </CardContent>
    </Card>
  )
}
