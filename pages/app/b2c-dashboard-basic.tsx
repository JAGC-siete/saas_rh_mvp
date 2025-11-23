import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '../../lib/auth'
import DashboardLayout from '../../components/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default function B2CDashboardBasic() {
  const { user } = useAuth()
  const [b2cData, setB2cData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hours, setHours] = useState('')
  const [rate, setRate] = useState('')
  const [salary, setSalary] = useState('')
  const [deductions, setDeductions] = useState('')
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    // Verify B2C access
    const checkAccess = async () => {
      if (!user) { // Add a check for the user object
        setLoading(false)
        return
      }
      if (!supabaseUrl || !supabaseAnonKey) {
        console.error("Supabase credentials not found")
        setLoading(false)
        return
      }
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
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

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Supabase credentials not found")
      }
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
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
