export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      attendance_events: {
        Row: {
          device_id: string | null
          employee_id: string
          event_type: string
          flags: Json | null
          geofence_ok: boolean | null
          id: string
          ip: unknown | null
          justification: string | null
          justification_category: string | null
          lat: number | null
          lon: number | null
          ref_record_id: string | null
          rule_applied: string | null
          source: string | null
          ts_local: string | null
          ts_utc: string
          tz: string
          tz_offset_minutes: number
        }
        Insert: {
          device_id?: string | null
          employee_id: string
          event_type: string
          flags?: Json | null
          geofence_ok?: boolean | null
          id?: string
          ip?: unknown | null
          justification?: string | null
          justification_category?: string | null
          lat?: number | null
          lon?: number | null
          ref_record_id?: string | null
          rule_applied?: string | null
          source?: string | null
          ts_local?: string | null
          ts_utc?: string
          tz?: string
          tz_offset_minutes?: number
        }
        Update: {
          device_id?: string | null
          employee_id?: string
          event_type?: string
          flags?: Json | null
          geofence_ok?: boolean | null
          id?: string
          ip?: unknown | null
          justification?: string | null
          justification_category?: string | null
          lat?: number | null
          lon?: number | null
          ref_record_id?: string | null
          rule_applied?: string | null
          source?: string | null
          ts_local?: string | null
          ts_utc?: string
          tz?: string
          tz_offset_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "attendance_events_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_events_ref_record_id_fkey"
            columns: ["ref_record_id"]
            isOneToOne: false
            referencedRelation: "attendance_records"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          check_in: string | null
          check_out: string | null
          created_at: string | null
          date: string
          early_departure_minutes: number | null
          employee_id: string | null
          expected_check_in: string | null
          expected_check_out: string | null
          flags: Json | null
          id: string
          justification: string | null
          justification_category: string | null
          late_minutes: number | null
          local_date: string | null
          rule_applied_in: string | null
          rule_applied_out: string | null
          status: string | null
          tz: string | null
          tz_offset_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date: string
          early_departure_minutes?: number | null
          employee_id?: string | null
          expected_check_in?: string | null
          expected_check_out?: string | null
          flags?: Json | null
          id?: string
          justification?: string | null
          justification_category?: string | null
          late_minutes?: number | null
          local_date?: string | null
          rule_applied_in?: string | null
          rule_applied_out?: string | null
          status?: string | null
          tz?: string | null
          tz_offset_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string
          early_departure_minutes?: number | null
          employee_id?: string | null
          expected_check_in?: string | null
          expected_check_out?: string | null
          flags?: Json | null
          id?: string
          justification?: string | null
          justification_category?: string | null
          late_minutes?: number | null
          local_date?: string | null
          rule_applied_in?: string | null
          rule_applied_out?: string | null
          status?: string | null
          tz?: string | null
          tz_offset_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string | null
          geofence_center_lat: number | null
          geofence_center_lon: number | null
          geofence_radius_m: number | null
          id: string
          is_active: boolean | null
          name: string
          paypal_subscription_id: string | null
          plan_type: string | null
          settings: Json | null
          subdomain: string | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          geofence_center_lat?: number | null
          geofence_center_lon?: number | null
          geofence_radius_m?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          paypal_subscription_id?: string | null
          plan_type?: string | null
          settings?: Json | null
          subdomain?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          geofence_center_lat?: number | null
          geofence_center_lon?: number | null
          geofence_radius_m?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          paypal_subscription_id?: string | null
          plan_type?: string | null
          settings?: Json | null
          subdomain?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          manager_id: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          manager_id?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_department_manager"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: Json | null
          bank_account: string | null
          bank_name: string | null
          base_salary: number
          company_id: string | null
          created_at: string | null
          department_id: string | null
          dni: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_code: string | null
          employee_pin_hash: string | null
          hire_date: string | null
          id: string
          metadata: Json | null
          name: string
          phone: string | null
          role: string | null
          status: string | null
          team: string | null
          termination_date: string | null
          updated_at: string | null
          work_schedule_id: string | null
        }
        Insert: {
          address?: Json | null
          bank_account?: string | null
          bank_name?: string | null
          base_salary: number
          company_id?: string | null
          created_at?: string | null
          department_id?: string | null
          dni: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_code?: string | null
          employee_pin_hash?: string | null
          hire_date?: string | null
          id?: string
          metadata?: Json | null
          name: string
          phone?: string | null
          role?: string | null
          status?: string | null
          team?: string | null
          termination_date?: string | null
          updated_at?: string | null
          work_schedule_id?: string | null
        }
        Update: {
          address?: Json | null
          bank_account?: string | null
          bank_name?: string | null
          base_salary?: number
          company_id?: string | null
          created_at?: string | null
          department_id?: string | null
          dni?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_code?: string | null
          employee_pin_hash?: string | null
          hire_date?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          phone?: string | null
          role?: string | null
          status?: string | null
          team?: string | null
          termination_date?: string | null
          updated_at?: string | null
          work_schedule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_work_schedule_id_fkey"
            columns: ["work_schedule_id"]
            isOneToOne: false
            referencedRelation: "work_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_run_lines: {
        Row: {
          calc_bruto: number
          calc_hours: number
          calc_ihss: number
          calc_isr: number
          calc_neto: number
          calc_rap: number
          company_id: string
          created_at: string
          edited: boolean
          eff_bruto: number
          eff_hours: number
          eff_ihss: number
          eff_isr: number
          eff_neto: number
          eff_rap: number
          employee_id: string
          id: string
          run_id: string
          updated_at: string
        }
        Insert: {
          calc_bruto: number
          calc_hours: number
          calc_ihss: number
          calc_isr: number
          calc_neto: number
          calc_rap: number
          company_id: string
          created_at?: string
          edited?: boolean
          eff_bruto: number
          eff_hours: number
          eff_ihss: number
          eff_isr: number
          eff_neto: number
          eff_rap: number
          employee_id: string
          id?: string
          run_id: string
          updated_at?: string
        }
        Update: {
          calc_bruto?: number
          calc_hours?: number
          calc_ihss?: number
          calc_isr?: number
          calc_neto?: number
          calc_rap?: number
          company_id?: string
          created_at?: string
          edited?: boolean
          eff_bruto?: number
          eff_hours?: number
          eff_ihss?: number
          eff_isr?: number
          eff_neto?: number
          eff_rap?: number
          employee_id?: string
          id?: string
          run_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_run_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_run_lines_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_run_lines_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          authorized_at: string | null
          authorized_by: string | null
          company_id: string
          created_at: string
          created_by: string
          id: string
          month: number
          quincena: number
          status: string
          tipo: string
          updated_at: string
          year: number
        }
        Insert: {
          authorized_at?: string | null
          authorized_by?: string | null
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          month: number
          quincena: number
          status: string
          tipo: string
          updated_at?: string
          year: number
        }
        Update: {
          authorized_at?: string | null
          authorized_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          month?: number
          quincena?: number
          status?: string
          tipo?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          company_id: string | null
          created_at: string | null
          employee_id: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          permissions: Json | null
          role: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          id: string
          is_active?: boolean | null
          last_login?: string | null
          permissions?: Json | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          permissions?: Json | null
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      work_schedules: {
        Row: {
          break_duration: number | null
          checkin_close: string | null
          checkin_open: string | null
          checkout_close: string | null
          checkout_open: string | null
          company_id: string | null
          created_at: string | null
          friday_end: string | null
          friday_start: string | null
          grace_minutes: number | null
          id: string
          late_to_inclusive: number | null
          monday_end: string | null
          monday_start: string | null
          name: string
          oor_from_minutes: number | null
          saturday_end: string | null
          saturday_start: string | null
          sunday_end: string | null
          sunday_start: string | null
          thursday_end: string | null
          thursday_start: string | null
          timezone: string | null
          tuesday_end: string | null
          tuesday_start: string | null
          updated_at: string | null
          wednesday_end: string | null
          wednesday_start: string | null
          work_days: Json | null
        }
        Insert: {
          break_duration?: number | null
          checkin_close?: string | null
          checkin_open?: string | null
          checkout_close?: string | null
          checkout_open?: string | null
          company_id?: string | null
          created_at?: string | null
          friday_end?: string | null
          friday_start?: string | null
          grace_minutes?: number | null
          id?: string
          late_to_inclusive?: number | null
          monday_end?: string | null
          monday_start?: string | null
          name: string
          oor_from_minutes?: number | null
          saturday_end?: string | null
          saturday_start?: string | null
          sunday_end?: string | null
          sunday_start?: string | null
          thursday_end?: string | null
          thursday_start?: string | null
          timezone?: string | null
          tuesday_end?: string | null
          tuesday_start?: string | null
          updated_at?: string | null
          wednesday_end?: string | null
          wednesday_start?: string | null
          work_days?: Json | null
        }
        Update: {
          break_duration?: number | null
          checkin_close?: string | null
          checkin_open?: string | null
          checkout_close?: string | null
          checkout_open?: string | null
          company_id?: string | null
          created_at?: string | null
          friday_end?: string | null
          friday_start?: string | null
          grace_minutes?: number | null
          id?: string
          late_to_inclusive?: number | null
          monday_end?: string | null
          monday_start?: string | null
          name?: string
          oor_from_minutes?: number | null
          saturday_end?: string | null
          saturday_start?: string | null
          sunday_end?: string | null
          sunday_start?: string | null
          thursday_end?: string | null
          thursday_start?: string | null
          timezone?: string | null
          tuesday_end?: string | null
          tuesday_start?: string | null
          updated_at?: string | null
          wednesday_end?: string | null
          wednesday_start?: string | null
          work_days?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "work_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      attendance_kpis_filtered: {
        Args: {
          p_company_id?: string
          p_employee_id?: string
          p_from?: string
          p_role?: string
          p_to?: string
        }
        Returns: {
          ausentes: number
          presentes: number
          tardes: number
          total_empleados: number
        }[]
      }
      attendance_lists_filtered: {
        Args: {
          p_company_id?: string
          p_employee_id?: string
          p_from?: string
          p_role?: string
          p_to?: string
          p_type?: string
        }
        Returns: {
          check_in: string
          check_out: string
          date: string
          employee_code: string
          employee_id: string
          id: string
          justification: string
          late_minutes: number
          name: string
          role: string
          status: string
          team: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

