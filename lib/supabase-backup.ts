// DEPRECATED: This file is being phased out in favor of lib/supabase/client.ts and lib/supabase/server.ts
// Keep for backward compatibility during migration

import { createClient as createBrowserClient } from './supabase/client'
import { Session } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'

// Legacy client export - use createClient from ./supabase/client.ts instead
export const supabase = createBrowserClient()

// Helper function to check if we have real env vars
export const hasValidSupabaseConfig = () => {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('PLACEHOLDER')
  )
}

// Log warning in development if using placeholder values
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && !hasValidSupabaseConfig()) {
  console.warn('⚠️ Using placeholder Supabase config. Please update your .env.local with real values.')
}

// Legacy admin client - use createAdminClient from ./supabase/server.ts instead
export const supabaseAdmin = null // Deprecated - use server-side clients

// Database types placeholder
export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          subdomain: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          subdomain: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          subdomain?: string
          created_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          company_id: string
          full_name: string
          email: string
          position: string
          department: string
          status: 'active' | 'inactive'
          dni: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          full_name: string
          email: string
          position: string
          department: string
          status?: 'active' | 'inactive'
          dni: string
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          full_name?: string
          email?: string
          position?: string
          department?: string
          status?: 'active' | 'inactive'
          dni?: string
          created_at?: string
        }
      }
      attendance_records: {
        Row: {
          id: string
          employee_id: string
          date: string
          check_in: string | null
          check_out: string | null
          status: 'present' | 'absent' | 'late'
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          date: string
          check_in?: string | null
          check_out?: string | null
          status?: 'present' | 'absent' | 'late'
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          date?: string
          check_in?: string | null
          check_out?: string | null
          status?: 'present' | 'absent' | 'late'
          created_at?: string
        }
      }
      payroll_records: {
        Row: {
          id: string
          employee_id: string
          period_start: string
          period_end: string
          base_salary: number
          deductions: number
          bonuses: number
          net_salary: number
          status: 'draft' | 'approved' | 'paid'
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          period_start: string
          period_end: string
          base_salary: number
          deductions?: number
          bonuses?: number
          net_salary: number
          status?: 'draft' | 'approved' | 'paid'
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          period_start?: string
          period_end?: string
          base_salary?: number
          deductions?: number
          bonuses?: number
          net_salary?: number
          status?: 'draft' | 'approved' | 'paid'
          created_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          company_id: string
          role: 'company_admin' | 'hr_manager' | 'employee'
          full_name: string
          created_at: string
        }
        Insert: {
          id: string
          company_id: string
          role: 'company_admin' | 'hr_manager' | 'employee'
          full_name: string
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          role?: 'company_admin' | 'hr_manager' | 'employee'
          full_name?: string
          created_at?: string
        }
      }
    }
  }
}

// DEPRECATED: Custom hook for session management - use Supabase SSR methods instead
export function useSupabaseSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.warn('⚠️ useSupabaseSession is deprecated. Migrate to @supabase/ssr patterns.')
    
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
      } catch (error) {
        console.error('Error getting session:', error)
        setSession(null)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setLoading(false)
      }
    )

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

  return { session, loading }
}
