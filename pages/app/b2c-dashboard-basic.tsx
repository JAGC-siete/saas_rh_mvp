import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth'
import { createClient } from '../../lib/supabase/server' // Adjust path as needed
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card' // Adjust paths
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'

export default function B2CDashboardBasic() {
  const { user } = useAuth()
  const [salary, setSalary] = useState('')
  const [deductions, setDeductions] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    // Verify B2C access
    const checkAccess = async () => {
      const supabase = createClient()
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_b2c, company_id')
        .eq('id', user.id)
        .single()

      if (!profile?.is_b2c || profile.company_id !== null) {
        setError('Access denied: B2C only')
      }
    }
    if (user) checkAccess()
  }, [user])

  const handleCalculate = async () => {
    setError('')
    setResult(null)

    try {
      const inputs = {
        salary: parseFloat(salary) || 0,
        deductions: JSON.parse(deductions || '{}')
      }

      const supabase = createClient()
      const { data, error: calcError } = await supabase.functions.invoke('payroll-calculation', {
        body: { inputs } // JSONB similar to payroll_run_lines
      })

      if (calcError) throw calcError

      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Calculation failed')
    }
  }

  if (error) return <div>{error}</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle>B2C Payroll Calculator</CardTitle>
      </CardHeader>
      <CardContent>
        <Input
          type="number"
          placeholder="Salary"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
        />
        <Input
          placeholder="Deductions JSON"
          value={deductions}
          onChange={(e) => setDeductions(e.target.value)}
        />
        <Button onClick={handleCalculate}>Calculate</Button>
        {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
      </CardContent>
    </Card>
  )
}
