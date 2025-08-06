import { Card, CardContent } from './ui/card'
import { Input } from './ui/input'

interface EmployeeSearchProps {
  searchTerm: string
  setSearchTerm: (_value: string) => void
}

export default function EmployeeSearch({ searchTerm, setSearchTerm }: EmployeeSearchProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <Input
          type="text"
          placeholder="Search employees by name, code, DNI, or position..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </CardContent>
    </Card>
  )
}
