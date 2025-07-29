import { createClient } from '@supabase/supabase-js'

// These will be your environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : createDummyClient()

// Service client for server-side operations (with service role key)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl!, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

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
