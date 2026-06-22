export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      achievement_types: {
        Row: {
          badge_color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: number
          name: string
          points_reward: number | null
          requirements: Json | null
        }
        Insert: {
          badge_color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: number
          name: string
          points_reward?: number | null
          requirements?: Json | null
        }
        Update: {
          badge_color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: number
          name?: string
          points_reward?: number | null
          requirements?: Json | null
        }
        Relationships: []
      }
      activaciones: {
        Row: {
          acepta_trial: boolean | null
          comprobante: string | null
          contacto_email: string
          contacto_nombre: string | null
          contacto_whatsapp: string | null
          created_at: string | null
          departamentos: Json | null
          empleados: number
          empresa: string | null
          id: string
          magic_link: string | null
          monto: number | null
          notas: string | null
          status: string | null
          tenant_id: string | null
          trial_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          acepta_trial?: boolean | null
          comprobante?: string | null
          contacto_email: string
          contacto_nombre?: string | null
          contacto_whatsapp?: string | null
          created_at?: string | null
          departamentos?: Json | null
          empleados: number
          empresa?: string | null
          id?: string
          magic_link?: string | null
          monto?: number | null
          notas?: string | null
          status?: string | null
          tenant_id?: string | null
          trial_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          acepta_trial?: boolean | null
          comprobante?: string | null
          contacto_email?: string
          contacto_nombre?: string | null
          contacto_whatsapp?: string | null
          created_at?: string | null
          departamentos?: Json | null
          empleados?: number
          empresa?: string | null
          id?: string
          magic_link?: string | null
          monto?: number | null
          notas?: string | null
          status?: string | null
          tenant_id?: string | null
          trial_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      affiliate_yearly_stats: {
        Row: {
          affiliate_id: string
          commission_rate: number
          created_at: string
          deals_closed: number
          has_early_bonus: boolean
          id: string
          updated_at: string
          year: number
        }
        Insert: {
          affiliate_id: string
          commission_rate?: number
          created_at?: string
          deals_closed?: number
          has_early_bonus?: boolean
          id?: string
          updated_at?: string
          year: number
        }
        Update: {
          affiliate_id?: string
          commission_rate?: number
          created_at?: string
          deals_closed?: number
          has_early_bonus?: boolean
          id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_yearly_stats_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          status: Database["public"]["Enums"]["affiliate_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          status?: Database["public"]["Enums"]["affiliate_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          status?: Database["public"]["Enums"]["affiliate_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      attendance_events: {
        Row: {
          device_id: string | null
          employee_id: string
          event_type: string
          event_uid: string | null
          flags: Json | null
          geofence_ok: boolean | null
          id: string
          ip: unknown
          justification: string | null
          justification_category: string | null
          lat: number | null
          local_date: string | null
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
          event_uid?: string | null
          flags?: Json | null
          geofence_ok?: boolean | null
          id?: string
          ip?: unknown
          justification?: string | null
          justification_category?: string | null
          lat?: number | null
          local_date?: string | null
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
          event_uid?: string | null
          flags?: Json | null
          geofence_ok?: boolean | null
          id?: string
          ip?: unknown
          justification?: string | null
          justification_category?: string | null
          lat?: number | null
          local_date?: string | null
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
            foreignKeyName: "attendance_events_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employees_norm"
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
          event_uid: string | null
          id: string
          justification: string | null
          justification_category: string | null
          late_minutes: number | null
          local_date: string | null
          lunch_end: string | null
          lunch_start: string | null
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
          event_uid?: string | null
          id?: string
          justification?: string | null
          justification_category?: string | null
          late_minutes?: number | null
          local_date?: string | null
          lunch_end?: string | null
          lunch_start?: string | null
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
          event_uid?: string | null
          id?: string
          justification?: string | null
          justification_category?: string | null
          late_minutes?: number | null
          local_date?: string | null
          lunch_end?: string | null
          lunch_start?: string | null
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
            foreignKeyName: "attendance_records_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_employees_norm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employees_norm"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_stage: {
        Row: {
          check_in: string | null
          check_out: string | null
          note: string | null
          raw_name: string
          shift: string | null
          work_date: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          note?: string | null
          raw_name: string
          shift?: string | null
          work_date: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          note?: string | null
          raw_name?: string
          shift?: string | null
          work_date?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string | null
          id: string
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
      commissions: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string
          id: string
          paid_at: string | null
          referred_company_id: string
          source_payment_id: string | null
          status: Database["public"]["Enums"]["commission_status"]
        }
        Insert: {
          affiliate_id: string
          amount: number
          created_at?: string
          id?: string
          paid_at?: string | null
          referred_company_id: string
          source_payment_id?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          referred_company_id?: string
          source_payment_id?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
        }
        Relationships: [
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_referred_company_id_fkey"
            columns: ["referred_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          geofence_center_lat: number | null
          geofence_center_lon: number | null
          geofence_radius_m: number | null
          id: string
          is_active: boolean | null
          name: string
          paypal_subscription_id: string | null
          plan_type: string | null
          referred_by_affiliate_id: string | null
          settings: Json | null
          subdomain: string | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          geofence_center_lat?: number | null
          geofence_center_lon?: number | null
          geofence_radius_m?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          paypal_subscription_id?: string | null
          plan_type?: string | null
          referred_by_affiliate_id?: string | null
          settings?: Json | null
          subdomain?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          geofence_center_lat?: number | null
          geofence_center_lon?: number | null
          geofence_radius_m?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          paypal_subscription_id?: string | null
          plan_type?: string | null
          referred_by_affiliate_id?: string | null
          settings?: Json | null
          subdomain?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_referred_by_affiliate_id_fkey"
            columns: ["referred_by_affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizaciones: {
        Row: {
          company_id: string | null
          contact_email: string
          contact_name: string | null
          company_name: string | null
          coupon_applied: boolean
          coupon_code_submitted: string | null
          created_at: string
          currency: string
          discount_amount: number
          discount_pct_applied: number
          email_message_id: string | null
          employees_count: number
          expected_deposit_hnl: number | null
          expected_total_hnl: number | null
          id: string
          meta: Json
          payment_status: string
          phone: string | null
          pricing_tier_id: string | null
          pricing_tier_snapshot: Json | null
          status: string
          subtotal: number
          terminals_count: number | null
          total: number
        }
        Insert: {
          company_id?: string | null
          contact_email: string
          contact_name?: string | null
          company_name?: string | null
          coupon_applied?: boolean
          coupon_code_submitted?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number
          discount_pct_applied?: number
          email_message_id?: string | null
          employees_count: number
          expected_deposit_hnl?: number | null
          expected_total_hnl?: number | null
          id?: string
          meta?: Json
          payment_status?: string
          phone?: string | null
          pricing_tier_id?: string | null
          pricing_tier_snapshot?: Json | null
          status?: string
          subtotal: number
          terminals_count?: number | null
          total: number
        }
        Update: {
          company_id?: string | null
          contact_email?: string
          contact_name?: string | null
          company_name?: string | null
          coupon_applied?: boolean
          coupon_code_submitted?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number
          discount_pct_applied?: number
          email_message_id?: string | null
          employees_count?: number
          expected_deposit_hnl?: number | null
          expected_total_hnl?: number | null
          id?: string
          meta?: Json
          payment_status?: string
          phone?: string | null
          pricing_tier_id?: string | null
          pricing_tier_snapshot?: Json | null
          status?: string
          subtotal?: number
          terminals_count?: number | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "cotizaciones_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_pricing_tier_id_fkey"
            columns: ["pricing_tier_id"]
            isOneToOne: false
            referencedRelation: "config_ventas_pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      company_meters: {
        Row: {
          attendances_recorded: number
          company_id: string
          created_at: string
          employees_created: number
          id: string
          month: string
          pdfs_generated: number
          updated_at: string
          vouchers_sent: number
        }
        Insert: {
          attendances_recorded?: number
          company_id: string
          created_at?: string
          employees_created?: number
          id?: string
          month: string
          pdfs_generated?: number
          updated_at?: string
          vouchers_sent?: number
        }
        Update: {
          attendances_recorded?: number
          company_id?: string
          created_at?: string
          employees_created?: number
          id?: string
          month?: string
          pdfs_generated?: number
          updated_at?: string
          vouchers_sent?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_meters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_payroll_configs: {
        Row: {
          calculation_config: Json | null
          calculation_script: string | null
          calculation_type: string | null
          company_id: string
          created_at: string | null
          custom_fields: Json | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          updated_at: string | null
        }
        Insert: {
          calculation_config?: Json | null
          calculation_script?: string | null
          calculation_type?: string | null
          company_id: string
          created_at?: string | null
          custom_fields?: Json | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          updated_at?: string | null
        }
        Update: {
          calculation_config?: Json | null
          calculation_script?: string | null
          calculation_type?: string | null
          company_id?: string
          created_at?: string | null
          custom_fields?: Json | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_payroll_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_subscriptions: {
        Row: {
          company_id: string
          created_at: string
          id: string
          plan: string
          status: string
          trial_end: string
          trial_start: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          plan?: string
          status?: string
          trial_end: string
          trial_start?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          plan?: string
          status?: string
          trial_end?: string
          trial_start?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_notifications: {
        Row: {
          conversion_id: string
          created_at: string | null
          delivery_confirmed_at: string | null
          error_message: string | null
          id: string
          message_content: string
          message_template: string
          notification_type: string
          recipient: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          conversion_id: string
          created_at?: string | null
          delivery_confirmed_at?: string | null
          error_message?: string | null
          id?: string
          message_content: string
          message_template: string
          notification_type: string
          recipient: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          conversion_id?: string
          created_at?: string | null
          delivery_confirmed_at?: string | null
          error_message?: string | null
          id?: string
          message_content?: string
          message_template?: string
          notification_type?: string
          recipient?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversion_notifications_conversion_id_fkey"
            columns: ["conversion_id"]
            isOneToOne: false
            referencedRelation: "trial_conversions"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "fk_department_manager"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "v_employees_norm"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          company_id: string
          created_at: string | null
          device_type: string | null
          id: string
          ip_address: string
          is_active: boolean | null
          last_event_at: string | null
          last_sync_at: string | null
          name: string
          password_encrypted: string
          port: number | null
          serial_number: string | null
          settings: Json | null
          status: string | null
          updated_at: string | null
          username: string
          webhook_url: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address: string
          is_active?: boolean | null
          last_event_at?: string | null
          last_sync_at?: string | null
          name: string
          password_encrypted: string
          port?: number | null
          serial_number?: string | null
          settings?: Json | null
          status?: string | null
          updated_at?: string | null
          username: string
          webhook_url?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string
          is_active?: boolean | null
          last_event_at?: string | null
          last_sync_at?: string | null
          name?: string
          password_encrypted?: string
          port?: number | null
          serial_number?: string | null
          settings?: Json | null
          status?: string | null
          updated_at?: string | null
          username?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_files: {
        Row: {
          id: string
          employee_id: string
          company_id: string
          file_type: string
          document_category: string | null
          storage_path: string
          file_name: string
          file_size_bytes: number
          mime_type: string
          uploaded_by: string
          is_active: boolean
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          company_id: string
          file_type: string
          document_category?: string | null
          storage_path: string
          file_name: string
          file_size_bytes: number
          mime_type: string
          uploaded_by: string
          is_active?: boolean
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          company_id?: string
          file_type?: string
          document_category?: string | null
          storage_path?: string
          file_name?: string
          file_size_bytes?: number
          mime_type?: string
          uploaded_by?: string
          is_active?: boolean
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_files_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_files_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_achievements: {
        Row: {
          achievement_type_id: number
          company_id: string
          earned_at: string | null
          employee_id: string
          id: number
          points_earned: number | null
        }
        Insert: {
          achievement_type_id: number
          company_id: string
          earned_at?: string | null
          employee_id: string
          id?: number
          points_earned?: number | null
        }
        Update: {
          achievement_type_id?: number
          company_id?: string
          earned_at?: string | null
          employee_id?: string
          id?: number
          points_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_achievements_achievement_type_id_fkey"
            columns: ["achievement_type_id"]
            isOneToOne: false
            referencedRelation: "achievement_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_achievements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_achievements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_achievements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employees_norm"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_aliases: {
        Row: {
          alias: string
          employee_id: string
        }
        Insert: {
          alias: string
          employee_id: string
        }
        Update: {
          alias?: string
          employee_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_aliases_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_aliases_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employees_norm"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_auth_logs: {
        Row: {
          auth_attempt_result: string
          created_at: string | null
          employee_id: string | null
          id: string
          ip_address: unknown
          last5_dni_hash: string
          user_agent: string | null
        }
        Insert: {
          auth_attempt_result: string
          created_at?: string | null
          employee_id?: string | null
          id?: string
          ip_address?: unknown
          last5_dni_hash: string
          user_agent?: string | null
        }
        Update: {
          auth_attempt_result?: string
          created_at?: string | null
          employee_id?: string | null
          id?: string
          ip_address?: unknown
          last5_dni_hash?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_auth_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_auth_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employees_norm"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_auth_sessions: {
        Row: {
          created_at: string | null
          device_fingerprint: string | null
          employee_id: string
          expires_at: string
          id: string
          ip_address: unknown
          is_active: boolean | null
          jti: string | null
          revoked_at: string | null
          revoked_reason: string | null
          rotated_from: string | null
          session_token_hash: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          device_fingerprint?: string | null
          employee_id: string
          expires_at: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          jti?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          rotated_from?: string | null
          session_token_hash: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string | null
          employee_id?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          jti?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          rotated_from?: string | null
          session_token_hash?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_auth_sessions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_auth_sessions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employees_norm"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_failed_attempts: {
        Row: {
          attempt_count: number | null
          created_at: string | null
          employee_id: string
          id: string
          ip_address: unknown
          last5_dni_hash: string
          locked_until: string | null
          updated_at: string | null
          window_start: string | null
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string | null
          employee_id: string
          id?: string
          ip_address: unknown
          last5_dni_hash: string
          locked_until?: string | null
          updated_at?: string | null
          window_start?: string | null
        }
        Update: {
          attempt_count?: number | null
          created_at?: string | null
          employee_id?: string
          id?: string
          ip_address?: unknown
          last5_dni_hash?: string
          locked_until?: string | null
          updated_at?: string | null
          window_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_failed_attempts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_failed_attempts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employees_norm"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_failed_attempts_ip: {
        Row: {
          attempt_count: number | null
          company_id: string
          created_at: string | null
          id: string
          ip_address: unknown
          locked_until: string | null
          updated_at: string | null
          window_start: string | null
        }
        Insert: {
          attempt_count?: number | null
          company_id: string
          created_at?: string | null
          id?: string
          ip_address: unknown
          locked_until?: string | null
          updated_at?: string | null
          window_start?: string | null
        }
        Update: {
          attempt_count?: number | null
          company_id?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          locked_until?: string | null
          updated_at?: string | null
          window_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_failed_attempts_ip_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_invitations: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string | null
          email: string
          employee_id: string
          expires_at: string
          id: string
          invited_by: string | null
          status: string | null
          token: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string | null
          email: string
          employee_id: string
          expires_at: string
          id?: string
          invited_by?: string | null
          status?: string | null
          token: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string | null
          email?: string
          employee_id?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          status?: string | null
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_invitations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_invitations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employees_norm"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_scores: {
        Row: {
          company_id: string
          created_at: string | null
          early_arrival_count: number | null
          employee_id: string
          id: number
          last_event_local_date: string | null
          last_reset_date: string | null
          last_week_start: string | null
          late_count_week: number | null
          monthly_points: number | null
          perfect_week_count: number | null
          punctuality_streak: number | null
          total_points: number | null
          updated_at: string | null
          weekly_points: number | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          early_arrival_count?: number | null
          employee_id: string
          id?: number
          last_event_local_date?: string | null
          last_reset_date?: string | null
          last_week_start?: string | null
          late_count_week?: number | null
          monthly_points?: number | null
          perfect_week_count?: number | null
          punctuality_streak?: number | null
          total_points?: number | null
          updated_at?: string | null
          weekly_points?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          early_arrival_count?: number | null
          employee_id?: string
          id?: number
          last_event_local_date?: string | null
          last_reset_date?: string | null
          last_week_start?: string | null
          late_count_week?: number | null
          monthly_points?: number | null
          perfect_week_count?: number | null
          punctuality_streak?: number | null
          total_points?: number | null
          updated_at?: string | null
          weekly_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_scores_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_scores_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employees_norm"
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
          /** GENERATED: base_salary / 240. Tarifa horaria de referencia. */
          hourly_rate_reference?: number
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
          is_b2c: boolean
          metadata: Json | null
          name: string
          phone: string | null
          role: string | null
          status: string | null
          team: string | null
          termination_date: string | null
          termination_reason_code: string | null
          termination_reason_detail: string | null
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
          is_b2c?: boolean
          metadata?: Json | null
          name: string
          phone?: string | null
          role?: string | null
          status?: string | null
          team?: string | null
          termination_date?: string | null
          termination_reason_code?: string | null
          termination_reason_detail?: string | null
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
          is_b2c?: boolean
          metadata?: Json | null
          name?: string
          phone?: string | null
          role?: string | null
          status?: string | null
          team?: string | null
          termination_date?: string | null
          termination_reason_code?: string | null
          termination_reason_detail?: string | null
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
      job_executions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          job_name: string
          result: Json | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          job_name: string
          result?: Json | null
          started_at?: string | null
          status: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          job_name?: string
          result?: Json | null
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          created_at: string | null
          days_requested: number
          duration_hours: number | null
          duration_type: string | null
          employee_dni: string | null
          employee_id: string | null
          end_date: string
          id: string
          is_half_day: boolean | null
          leave_type_id: string
          reason: string | null
          rejection_reason: string | null
          start_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          created_at?: string | null
          days_requested: number
          duration_hours?: number | null
          duration_type?: string | null
          employee_dni?: string | null
          employee_id?: string | null
          end_date: string
          id?: string
          is_half_day?: boolean | null
          leave_type_id: string
          reason?: string | null
          rejection_reason?: string | null
          start_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          created_at?: string | null
          days_requested?: number
          duration_hours?: number | null
          duration_type?: string | null
          employee_dni?: string | null
          employee_id?: string | null
          end_date?: string
          id?: string
          is_half_day?: boolean | null
          leave_type_id?: string
          reason?: string | null
          rejection_reason?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_employees_norm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employees_norm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          color: string | null
          company_id: string
          created_at: string | null
          employee_self_service: boolean
          id: string
          is_paid: boolean | null
          is_statutory_art95: boolean
          max_days_per_year: number | null
          name: string
          requires_approval: boolean | null
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string | null
          employee_self_service?: boolean
          id?: string
          is_paid?: boolean | null
          is_statutory_art95?: boolean
          max_days_per_year?: number | null
          name: string
          requires_approval?: boolean | null
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string | null
          employee_self_service?: boolean
          id?: string
          is_paid?: boolean | null
          is_statutory_art95?: boolean
          max_days_per_year?: number | null
          name?: string
          requires_approval?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_payments: {
        Row: {
          amount_hnl: number
          company_id: string
          created_by: string | null
          id: string
          paid_at: string
          payment_kind: string
          quote_id: string | null
          reference: string | null
        }
        Insert: {
          amount_hnl: number
          company_id: string
          created_by?: string | null
          id?: string
          paid_at?: string
          payment_kind?: string
          quote_id?: string | null
          reference?: string | null
        }
        Update: {
          amount_hnl?: number
          company_id?: string
          created_by?: string | null
          id?: string
          paid_at?: string
          payment_kind?: string
          quote_id?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_payments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          role?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      paypal_transactions: {
        Row: {
          amount: number | null
          company_id: string | null
          created_at: string | null
          currency: string | null
          custom_id: string | null
          id: string
          order_id: string | null
          payload: Json | null
          paypal_event_id: string | null
          paypal_payment_id: string | null
          status: string | null
          subscription_id: string | null
        }
        Insert: {
          amount?: number | null
          company_id?: string | null
          created_at?: string | null
          currency?: string | null
          custom_id?: string | null
          id?: string
          order_id?: string | null
          payload?: Json | null
          paypal_event_id?: string | null
          paypal_payment_id?: string | null
          status?: string | null
          subscription_id?: string | null
        }
        Update: {
          amount?: number | null
          company_id?: string | null
          created_at?: string | null
          currency?: string | null
          custom_id?: string | null
          id?: string
          order_id?: string | null
          payload?: Json | null
          paypal_event_id?: string | null
          paypal_payment_id?: string | null
          status?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paypal_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_adjustments: {
        Row: {
          company_id: string
          created_at: string
          field: string
          id: string
          new_value: number
          old_value: number | null
          reason: string | null
          run_line_id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          field: string
          id?: string
          new_value: number
          old_value?: number | null
          reason?: string | null
          run_line_id: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          field?: string
          id?: string
          new_value?: number
          old_value?: number | null
          reason?: string | null
          run_line_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_adjustments_run_line_id_fkey"
            columns: ["run_line_id"]
            isOneToOne: false
            referencedRelation: "payroll_run_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_adjustments_run_line_id_fkey"
            columns: ["run_line_id"]
            isOneToOne: false
            referencedRelation: "v_payroll_lines_effective"
            referencedColumns: ["run_line_id"]
          },
        ]
      }
      payroll_extracted_employees: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          extracted_department: string | null
          extracted_dni: string | null
          extracted_name: string | null
          extracted_position: string | null
          extracted_salary: number | null
          id: string
          notes: string | null
          processed_employee_id: string | null
          row_number: number
          upload_id: string
          validation_status: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          extracted_department?: string | null
          extracted_dni?: string | null
          extracted_name?: string | null
          extracted_position?: string | null
          extracted_salary?: number | null
          id?: string
          notes?: string | null
          processed_employee_id?: string | null
          row_number: number
          upload_id: string
          validation_status?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          extracted_department?: string | null
          extracted_dni?: string | null
          extracted_name?: string | null
          extracted_position?: string | null
          extracted_salary?: number | null
          id?: string
          notes?: string | null
          processed_employee_id?: string | null
          row_number?: number
          upload_id?: string
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_extracted_employees_processed_employee_id_fkey"
            columns: ["processed_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_extracted_employees_processed_employee_id_fkey"
            columns: ["processed_employee_id"]
            isOneToOne: false
            referencedRelation: "v_employees_norm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_extracted_employees_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "payroll_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_records: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          base_salary: number
          bonuses: number | null
          commissions: number | null
          created_at: string | null
          days_absent: number | null
          days_worked: number | null
          employee_id: string | null
          generated_at: string | null
          generated_by: string | null
          gross_salary: number
          id: string
          income_tax: number | null
          late_days: number | null
          metadata: Json | null
          net_salary: number
          notes: string | null
          notes_on_deductions: string | null
          notes_on_ingress: string | null
          other_deductions: number | null
          other_earnings: number | null
          overtime_amount: number | null
          overtime_hours: number | null
          paid_at: string | null
          period_end: string
          period_start: string
          period_type: string | null
          professional_tax: number | null
          social_security: number | null
          status: string | null
          total_deductions: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          base_salary: number
          bonuses?: number | null
          commissions?: number | null
          created_at?: string | null
          days_absent?: number | null
          days_worked?: number | null
          employee_id?: string | null
          generated_at?: string | null
          generated_by?: string | null
          gross_salary: number
          id?: string
          income_tax?: number | null
          late_days?: number | null
          metadata?: Json | null
          net_salary: number
          notes?: string | null
          notes_on_deductions?: string | null
          notes_on_ingress?: string | null
          other_deductions?: number | null
          other_earnings?: number | null
          overtime_amount?: number | null
          overtime_hours?: number | null
          paid_at?: string | null
          period_end: string
          period_start: string
          period_type?: string | null
          professional_tax?: number | null
          social_security?: number | null
          status?: string | null
          total_deductions?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          base_salary?: number
          bonuses?: number | null
          commissions?: number | null
          created_at?: string | null
          days_absent?: number | null
          days_worked?: number | null
          employee_id?: string | null
          generated_at?: string | null
          generated_by?: string | null
          gross_salary?: number
          id?: string
          income_tax?: number | null
          late_days?: number | null
          metadata?: Json | null
          net_salary?: number
          notes?: string | null
          notes_on_deductions?: string | null
          notes_on_ingress?: string | null
          other_deductions?: number | null
          other_earnings?: number | null
          overtime_amount?: number | null
          overtime_hours?: number | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          period_type?: string | null
          professional_tax?: number | null
          social_security?: number | null
          status?: string | null
          total_deductions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_records_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_employees_norm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employees_norm"
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
          metadata: Json | null
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
          metadata?: Json | null
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
          metadata?: Json | null
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
            foreignKeyName: "payroll_run_lines_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employees_norm"
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
        Relationships: [
          {
            foreignKeyName: "payroll_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_snapshots: {
        Row: {
          company_id: string
          created_at: string
          id: string
          payload: Json
          run_line_id: string
          version: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          payload: Json
          run_line_id: string
          version: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          payload?: Json
          run_line_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_snapshots_run_line_id_fkey"
            columns: ["run_line_id"]
            isOneToOne: false
            referencedRelation: "payroll_run_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_snapshots_run_line_id_fkey"
            columns: ["run_line_id"]
            isOneToOne: false
            referencedRelation: "v_payroll_lines_effective"
            referencedColumns: ["run_line_id"]
          },
        ]
      }
      payroll_uploads: {
        Row: {
          company_id: string
          conversion_status: string | null
          converted_company_id: string | null
          created_at: string | null
          error_message: string | null
          extracted_data: Json | null
          file_name: string
          file_size_bytes: number
          file_type: string
          file_url: string
          id: string
          processing_completed_at: string | null
          processing_started_at: string | null
          storage_bucket: string | null
          storage_path: string | null
          tenant_id: string
          updated_at: string | null
          upload_status: string | null
        }
        Insert: {
          company_id: string
          conversion_status?: string | null
          converted_company_id?: string | null
          created_at?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          file_name: string
          file_size_bytes: number
          file_type: string
          file_url: string
          id?: string
          processing_completed_at?: string | null
          processing_started_at?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          tenant_id: string
          updated_at?: string | null
          upload_status?: string | null
        }
        Update: {
          company_id?: string
          conversion_status?: string | null
          converted_company_id?: string | null
          created_at?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          file_name?: string
          file_size_bytes?: number
          file_type?: string
          file_url?: string
          id?: string
          processing_completed_at?: string | null
          processing_started_at?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          tenant_id?: string
          updated_at?: string | null
          upload_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_uploads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_uploads_converted_company_id_fkey"
            columns: ["converted_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      point_history: {
        Row: {
          action_type: string
          company_id: string
          created_at: string | null
          employee_id: string
          id: number
          points_earned: number
          reason: string
          reference_date: string | null
        }
        Insert: {
          action_type: string
          company_id: string
          created_at?: string | null
          employee_id: string
          id?: number
          points_earned: number
          reason: string
          reference_date?: string | null
        }
        Update: {
          action_type?: string
          company_id?: string
          created_at?: string | null
          employee_id?: string
          id?: number
          points_earned?: number
          reason?: string
          reference_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "point_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employees_norm"
            referencedColumns: ["id"]
          },
        ]
      }
      recursos: {
        Row: {
          id: string
          slug: string
          title: string
          description: string
          content: string
          date_published: string
          date_modified: string | null
          image: string | null
          author: string | null
          status: string
          category: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          description?: string
          content?: string
          date_published?: string
          date_modified?: string | null
          image?: string | null
          author?: string | null
          status?: string
          category?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          description?: string
          content?: string
          date_published?: string
          date_modified?: string | null
          image?: string | null
          author?: string | null
          status?: string
          category?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      supervisor_teams: {
        Row: {
          company_id: string
          created_at: string | null
          employee_id: string
          id: string
          supervisor_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          employee_id: string
          id?: string
          supervisor_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          employee_id?: string
          id?: string
          supervisor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_teams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_teams_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_teams_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employees_norm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_teams_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_teams_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "v_employees_norm"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          created_at: string | null
          id: string
          level: string
          message: string
          meta: Json | null
          timestamp: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          level: string
          message: string
          meta?: Json | null
          timestamp?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: string
          message?: string
          meta?: Json | null
          timestamp?: string | null
        }
        Relationships: []
      }
      trial_access_users: {
        Row: {
          access_count: number | null
          company_id: string
          created_at: string | null
          email: string
          empleados_solicitados: number | null
          empresa_solicitante: string | null
          id: string
          is_active: boolean | null
          last_access_at: string | null
          nombre: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          access_count?: number | null
          company_id: string
          created_at?: string | null
          email: string
          empleados_solicitados?: number | null
          empresa_solicitante?: string | null
          id?: string
          is_active?: boolean | null
          last_access_at?: string | null
          nombre: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          access_count?: number | null
          company_id?: string
          created_at?: string | null
          email?: string
          empleados_solicitados?: number | null
          empresa_solicitante?: string | null
          id?: string
          is_active?: boolean | null
          last_access_at?: string | null
          nombre?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trial_access_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_conversions: {
        Row: {
          admin_notes: string | null
          conversion_completed_at: string | null
          conversion_started_at: string | null
          conversion_type: string | null
          converted_company_id: string | null
          created_at: string | null
          error_details: Json | null
          id: string
          original_company_id: string
          progress_percentage: number | null
          status: string | null
          tenant_id: string
          total_departments_created: number | null
          total_employees_created: number | null
          total_employees_expected: number | null
          updated_at: string | null
          upload_id: string
        }
        Insert: {
          admin_notes?: string | null
          conversion_completed_at?: string | null
          conversion_started_at?: string | null
          conversion_type?: string | null
          converted_company_id?: string | null
          created_at?: string | null
          error_details?: Json | null
          id?: string
          original_company_id: string
          progress_percentage?: number | null
          status?: string | null
          tenant_id: string
          total_departments_created?: number | null
          total_employees_created?: number | null
          total_employees_expected?: number | null
          updated_at?: string | null
          upload_id: string
        }
        Update: {
          admin_notes?: string | null
          conversion_completed_at?: string | null
          conversion_started_at?: string | null
          conversion_type?: string | null
          converted_company_id?: string | null
          created_at?: string | null
          error_details?: Json | null
          id?: string
          original_company_id?: string
          progress_percentage?: number | null
          status?: string | null
          tenant_id?: string
          total_departments_created?: number | null
          total_employees_created?: number | null
          total_employees_expected?: number | null
          updated_at?: string | null
          upload_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trial_conversions_converted_company_id_fkey"
            columns: ["converted_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_conversions_original_company_id_fkey"
            columns: ["original_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_conversions_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "payroll_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          company_id: string | null
          created_at: string | null
          employee_id: string | null
          id: string
          is_active: boolean | null
          is_b2c: boolean
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
          is_b2c?: boolean
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
          is_b2c?: boolean
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
          {
            foreignKeyName: "user_profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employees_norm"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          company_id: string | null
          created_at: string
          device_id: string | null
          expires_at: string
          id: string
          idle_timeout_at: string
          ip_hash: string | null
          last_activity: string
          metadata: Json | null
          revoked_at: string | null
          session_token: string
          tenant_id: string | null
          ua_hash: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          device_id?: string | null
          expires_at: string
          id?: string
          idle_timeout_at: string
          ip_hash?: string | null
          last_activity?: string
          metadata?: Json | null
          revoked_at?: string | null
          session_token: string
          tenant_id?: string | null
          ua_hash?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          device_id?: string | null
          expires_at?: string
          id?: string
          idle_timeout_at?: string
          ip_hash?: string | null
          last_activity?: string
          metadata?: Json | null
          revoked_at?: string | null
          session_token?: string
          tenant_id?: string | null
          ua_hash?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      employee_leaderboard: {
        Row: {
          company_id: string | null
          early_arrival_count: number | null
          employee_code: string | null
          employee_id: string | null
          monthly_points: number | null
          monthly_rank: number | null
          name: string | null
          perfect_week_count: number | null
          punctuality_streak: number | null
          total_points: number | null
          total_rank: number | null
          weekly_points: number | null
          weekly_rank: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_scores_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_scores_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employees_norm"
            referencedColumns: ["id"]
          },
        ]
      }
      realtime_leaderboard: {
        Row: {
          company_id: string | null
          employee_code: string | null
          employee_id: string | null
          monthly_points: number | null
          monthly_rank: number | null
          name: string | null
          punctuality_streak: number | null
          total_points: number | null
          total_rank: number | null
          updated_at: string | null
          weekly_points: number | null
          weekly_rank: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_scores_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_scores_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employees_norm"
            referencedColumns: ["id"]
          },
        ]
      }
      v_employees_norm: {
        Row: {
          code: string | null
          dni: string | null
          id: string | null
          norm_name: string | null
          status: string | null
        }
        Insert: {
          code?: string | null
          dni?: string | null
          id?: string | null
          norm_name?: never
          status?: string | null
        }
        Update: {
          code?: string | null
          dni?: string | null
          id?: string | null
          norm_name?: never
          status?: string | null
        }
        Relationships: []
      }
      v_payroll_lines_effective: {
        Row: {
          calc_bruto: number | null
          calc_hours: number | null
          calc_ihss: number | null
          calc_isr: number | null
          calc_neto: number | null
          calc_rap: number | null
          company_uuid: string | null
          created_at: string | null
          department_id: string | null
          edited: boolean | null
          eff_bruto: number | null
          eff_hours: number | null
          eff_ihss: number | null
          eff_isr: number | null
          eff_neto: number | null
          eff_rap: number | null
          employee_code: string | null
          employee_id: string | null
          employee_name: string | null
          month: number | null
          quincena: number | null
          run_id: string | null
          run_line_id: string | null
          run_status: string | null
          tipo: string | null
          updated_at: string | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_run_lines_company_id_fkey"
            columns: ["company_uuid"]
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
            foreignKeyName: "payroll_run_lines_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employees_norm"
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
    }
    Functions: {
      activate_from_quote: {
        Args: {
          p_amount_hnl: number
          p_company_id: string
          p_created_by?: string
          p_paid_at?: string
          p_payment_kind?: string
          p_plan_type?: string
          p_quote_id?: string
          p_reference: string
        }
        Returns: Json
      }
      apply_payroll_adjustment: {
        Args: {
          p_company_id: string
          p_field: string
          p_new_value: number
          p_reason: string
          p_run_line_id: string
          p_user_id: string
        }
        Returns: Json
      }
      assign_employee_to_supervisor: {
        Args: {
          p_company_id: string
          p_employee_id: string
          p_supervisor_id: string
        }
        Returns: boolean
      }
      attendance_aggregate: {
        Args: { p_from?: string; p_grain?: string; p_to?: string }
        Returns: {
          absent_count: number
          attendance_rate: number
          late_count: number
          period: string
          present_count: number
          total_employees: number
        }[]
      }
      attendance_employee_timeline: {
        Args: { p_employee_id: string; p_from?: string; p_to?: string }
        Returns: {
          check_in: string
          check_out: string
          date: string
          hours_worked: number
          late_minutes: number
          status: string
        }[]
      }
      attendance_export:
        | {
            Args: { p_employee_id?: string; p_from?: string; p_to?: string }
            Returns: {
              check_in: string
              check_out: string
              date: string
              employee_code: string
              employee_name: string
              hours_worked: number
              late_minutes: number
              status: string
            }[]
          }
        | {
            Args: { from: string; to: string }
            Returns: {
              check_in: string
              check_out: string
              date: string
              employee_id: string
              employee_name: string
              late_minutes: number
              status: string
              team: string
            }[]
          }
      attendance_kpis:
        | {
            Args: { from: string; team?: string; to: string }
            Returns: {
              ausentes: number
              presentes: number
              tardes: number
              tempranos: number
            }[]
          }
        | {
            Args: {
              p_employee_id?: string
              p_from: string
              p_role?: string
              p_to: string
            }
            Returns: {
              ausentes: number
              presentes: number
              tardes: number
              tempranos: number
              total_empleados: number
            }[]
          }
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
          tempranos: number
          total_empleados: number
        }[]
      }
      attendance_kpis_unified: {
        Args: {
          _company_id?: string
          _employee_id?: string
          _preset?: string
          _tz?: string
          _week_start?: number
        }
        Returns: Json
      }
      attendance_lists:
        | {
            Args: { scope: string; team?: string; type: string }
            Returns: {
              check_in_time: string
              delta_min: number
              id: string
              name: string
              team_out: string
            }[]
          }
        | {
            Args: {
              p_employee_id?: string
              p_role?: string
              p_scope: string
              p_type: string
            }
            Returns: {
              check_in: string
              check_out: string
              date: string
              department: string
              dni: string
              employee_code: string
              id: string
              late_minutes: number
              name: string
              status: string
              team: string
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
          dni: string
          employee_code: string
          id: string
          late_minutes: number
          name: string
          role: string
          status: string
          team: string
        }[]
      }
      authenticate_employee: {
        Args: {
          p_company_id: string
          p_ip_address: unknown
          p_last5: string
          p_last5_pepper: string
          p_pin: string
          p_pin_pepper: string
          p_user_agent: string
        }
        Returns: {
          employee_data: Json
          error_message: string
          expires_at: string
          locked_until: string
          session_token: string
          success: boolean
        }[]
      }
      calculate_attendance_points: {
        Args: {
          p_employee_id: string
          p_is_early?: boolean
          p_late_minutes: number
        }
        Returns: number
      }
      cleanup_expired_employee_data: {
        Args: never
        Returns: {
          attempts_deleted: number
          logs_deleted: number
          sessions_deleted: number
        }[]
      }
      cleanup_expired_sessions: { Args: never; Returns: number }
      cleanup_old_payroll_uploads: {
        Args: never
        Returns: {
          deleted_count: number
          paths_to_delete: string[]
        }[]
      }
      complete_conversion: {
        Args: {
          p_conversion_id: string
          p_converted_company_id: string
          p_total_departments: number
          p_total_employees: number
        }
        Returns: undefined
      }
      create_commission_for_new_deal: {
        Args: { company_id_in: string }
        Returns: undefined
      }
      create_or_update_payroll_run: {
        Args: {
          p_company_uuid: string
          p_month: number
          p_quincena: number
          p_tipo: string
          p_user_id: string
          p_year: number
        }
        Returns: string
      }
      create_user_session: {
        Args: {
          p_access_token_ttl_seconds?: number
          p_company_id?: string
          p_device_id?: string
          p_idle_timeout_minutes?: number
          p_ip_hash?: string
          p_session_token: string
          p_ua_hash?: string
          p_user_id: string
        }
        Returns: string
      }
      diagnose_employee_access: {
        Args: { employee_email: string }
        Returns: {
          check_name: string
          details: string
          status: string
        }[]
      }
      expire_old_invitations: { Args: never; Returns: undefined }
      fail_conversion: {
        Args: { p_conversion_id: string; p_error_details: Json }
        Returns: undefined
      }
      generate_employee_session_token: { Args: never; Returns: string }
      get_payroll_run_status: { Args: { p_run_id: string }; Returns: string }
      get_payroll_upload_url: {
        Args: { p_expires_in?: number; p_filename: string; p_tenant_id: string }
        Returns: Json
      }
      get_supervised_employees: {
        Args: { p_supervisor_id: string }
        Returns: {
          employee_id: string
        }[]
      }
      get_user_company: { Args: never; Returns: string }
      get_user_company_id: { Args: never; Returns: string }
      get_user_role_hierarchy: { Args: { p_user_id: string }; Returns: Json }
      inc_meter: {
        Args: { p_company_id: string; p_field: string; p_month: string }
        Returns: undefined
      }
      insert_payroll_line: {
        Args: {
          p_calc_bruto: number
          p_calc_hours: number
          p_calc_ihss: number
          p_calc_isr: number
          p_calc_neto: number
          p_calc_rap: number
          p_company_uuid: string
          p_employee_id: string
          p_run_id: string
        }
        Returns: string
      }
      is_company_admin: { Args: never; Returns: boolean }
      is_session_active: { Args: { p_session_token: string }; Returns: boolean }
      refresh_materialized_view: {
        Args: { view_name: string }
        Returns: undefined
      }
      reports_attendance: {
        Args: {
          p_company_id: string
          p_department_ids?: string[]
          p_employee_ids?: string[]
          p_from: string
          p_status_filter?: string[]
          p_to: string
        }
        Returns: {
          check_in: string
          check_out: string
          date: string
          department_name: string
          dni: string
          employee_code: string
          employee_id: string
          employee_name: string
          expected_check_in: string
          expected_check_out: string
          hours_worked: number
          justification: string
          late_minutes: number
          status: string
        }[]
      }
      reports_attendance_summary: {
        Args: {
          p_company_id: string
          p_department_ids?: string[]
          p_employee_ids?: string[]
          p_from: string
          p_to: string
        }
        Returns: {
          absent_count: number
          attendance_rate: number
          late_count: number
          late_minutes_total: number
          present_count: number
          punctuality_rate: number
          total_hours_worked: number
          total_records: number
        }[]
      }
      reports_calculate_severance: {
        Args: {
          p_company_id: string
          p_employee_id: string
          p_termination_date: string
        }
        Returns: {
          average_salary: number
          calculation_breakdown: Json
          dni: string
          employee_name: string
          hire_date: string
          severance_amount: number
          termination_date: string
          total_settlement: number
          vacation_balance: number
          years_tenure: number
        }[]
      }
      reports_employees: {
        Args: {
          p_company_id: string
          p_department_ids?: string[]
          p_status_filter?: string
        }
        Returns: {
          base_salary: number
          department_name: string
          dni: string
          email: string
          employee_code: string
          employee_id: string
          hire_date: string
          name: string
          phone: string
          position: string
          role: string
          status: string
          termination_date: string
          years_tenure: number
        }[]
      }
      reports_employees_summary: {
        Args: { p_company_id: string; p_department_ids?: string[] }
        Returns: {
          active_employees: number
          avg_years_tenure: number
          inactive_employees: number
          new_this_month: number
          terminated_employees: number
          total_departments: number
          total_employees: number
        }[]
      }
      reports_payroll: {
        Args: {
          p_company_id: string
          p_department_ids?: string[]
          p_employee_ids?: string[]
          p_from: string
          p_payroll_type?: string
          p_to: string
        }
        Returns: {
          base_salary: number
          bonuses: number
          commissions: number
          days_absent: number
          days_worked: number
          department_name: string
          dni: string
          employee_code: string
          employee_id: string
          employee_name: string
          gross_salary: number
          income_tax: number
          late_days: number
          net_salary: number
          other_deductions: number
          other_earnings: number
          overtime_amount: number
          overtime_hours: number
          period_end: string
          period_start: string
          period_type: string
          professional_tax: number
          social_security: number
          status: string
          total_deductions: number
        }[]
      }
      reports_payroll_summary: {
        Args: {
          p_company_id: string
          p_department_ids?: string[]
          p_employee_ids?: string[]
          p_from: string
          p_to: string
        }
        Returns: {
          draft_count: number
          paid_count: number
          pending_count: number
          total_deductions: number
          total_employees: number
          total_gross_salary: number
          total_net_salary: number
          total_overtime_amount: number
          total_overtime_hours: number
          total_payroll_records: number
        }[]
      }
      reports_work_certificate_data: {
        Args: {
          p_certificate_date?: string
          p_company_id: string
          p_employee_id: string
        }
        Returns: {
          base_salary: number
          certificate_date: string
          company_name: string
          department_name: string
          dni: string
          employee_name: string
          hire_date: string
          months_tenure: number
          position: string
          years_tenure: number
        }[]
      }
      revoke_all_user_sessions: {
        Args: { p_exclude_token?: string; p_user_id: string }
        Returns: number
      }
      revoke_user_session: {
        Args: { p_reason?: string; p_session_token: string }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      time_bounds: {
        Args: { _preset: string; _tz?: string; _week_start?: number }
        Returns: {
          end_ts: string
          start_ts: string
        }[]
      }
      time_bounds_week: {
        Args: { _ref: string; _tz: string; _week_start: number }
        Returns: {
          end_ts: string
          start_ts: string
        }[]
      }
      unaccent_immutable: { Args: { "": string }; Returns: string }
      update_conversion_progress: {
        Args: {
          p_conversion_id: string
          p_departments_created?: number
          p_employees_created?: number
          p_progress_percentage: number
        }
        Returns: undefined
      }
      update_employee_score: {
        Args: {
          p_action_type: string
          p_company_id: string
          p_employee_id: string
          p_points_to_add: number
          p_reason: string
        }
        Returns: undefined
      }
      update_session_activity: {
        Args: { p_session_token: string; p_user_id?: string }
        Returns: boolean
      }
    }
    Enums: {
      affiliate_status: "pending" | "approved" | "rejected"
      commission_status: "pending" | "paid" | "cancelled"
      paragon_role: "gerente_general" | "supervisor" | "empleado"
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
  public: {
    Enums: {
      affiliate_status: ["pending", "approved", "rejected"],
      commission_status: ["pending", "paid", "cancelled"],
      paragon_role: ["gerente_general", "supervisor", "empleado"],
    },
  },
} as const
