import { createClient } from '@supabase/supabase-js'

// Use the correct credentials for browser
const supabaseUrl = 'https://fwyxmovfrzauebiqxchz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxODk5MjEsImV4cCI6MjA2Nzc2NTkyMX0.pXArDqHGA4yjprTqJfsNQXwzS-WLz6NCK5QRbLAyYmA'

// Create a dummy client for build time if variables are missing
const createDummyClient = () => ({
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: () => Promise.resolve({ error: null }),
    signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Supabase not configured' } }),
    signUp: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Supabase not configured' } }),
    resetPasswordForEmail: () => Promise.resolve({ error: null }),
    updateUser: () => Promise.resolve({ data: { user: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null })
  },
  from: () => ({
    select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) })
  })
})

// Client for browser usage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Service client for server-side operations (with service role key)
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I'

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Database types (you'll generate this later with: npx supabase gen types typescript --local)
export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          subdomain: string | null
          plan_type: string | null
          settings: any | null
          created_at: string | null
          updated_at: string | null
          is_active: boolean | null
        }
        Insert: {
          id?: string
          name: string
          subdomain?: string | null
          plan_type?: string | null
          settings?: any | null
          created_at?: string | null
          updated_at?: string | null
          is_active?: boolean | null
        }
        Update: {
          id?: string
          name?: string
          subdomain?: string | null
          plan_type?: string | null
          settings?: any | null
          created_at?: string | null
          updated_at?: string | null
          is_active?: boolean | null
        }
      }
      employees: {
        Row: {
          id: string
          company_id: string
          department_id: string | null
          work_schedule_id: string | null
          employee_code: string | null
          dni: string
          name: string
          email: string | null
          phone: string | null
          role: string | null
          position: string | null
          base_salary: number
          hire_date: string | null
          termination_date: string | null
          status: string | null
          bank_name: string | null
          bank_account: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          address: any | null
          metadata: any | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          department_id?: string | null
          work_schedule_id?: string | null
          employee_code?: string | null
          dni: string
          name: string
          email?: string | null
          phone?: string | null
          role?: string | null
          position?: string | null
          base_salary: number
          hire_date?: string | null
          termination_date?: string | null
          status?: string | null
          bank_name?: string | null
          bank_account?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          address?: any | null
          metadata?: any | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          department_id?: string | null
          work_schedule_id?: string | null
          employee_code?: string | null
          dni?: string
          name?: string
          email?: string | null
          phone?: string | null
          role?: string | null
          position?: string | null
          base_salary?: number
          hire_date?: string | null
          termination_date?: string | null
          status?: string | null
          bank_name?: string | null
          bank_account?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          address?: any | null
          metadata?: any | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      // Add other table types as needed...
    }
  }
}

export { useSupabaseSession } from './hooks/useSession'
export default supabase
