export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          email: string | null
          phone: string | null
          specialty: string | null
          license_number: string | null
          date_of_birth: string | null
          organization_name: string | null
          provider_type: Database["public"]["Enums"]["provider_type"] | null
          address: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          email?: string | null
          phone?: string | null
          specialty?: string | null
          license_number?: string | null
          date_of_birth?: string | null
          organization_name?: string | null
          provider_type?: Database["public"]["Enums"]["provider_type"] | null
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          email?: string | null
          phone?: string | null
          specialty?: string | null
          license_number?: string | null
          date_of_birth?: string | null
          organization_name?: string | null
          provider_type?: Database["public"]["Enums"]["provider_type"] | null
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: Database["public"]["Enums"]["app_role"]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: Database["public"]["Enums"]["app_role"]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          id: string
          doctor_id: string
          center_id: string
          patient_id: string | null
          patient_name: string
          patient_phone: string | null
          patient_dob: string | null
          specialty_needed: string | null
          reason: string
          clinical_notes: string | null
          urgency: Database["public"]["Enums"]["referral_urgency"]
          status: Database["public"]["Enums"]["referral_status"]
          rejection_reason: string | null
          redirected_to_referral_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          center_id: string
          patient_id?: string | null
          patient_name: string
          patient_phone?: string | null
          patient_dob?: string | null
          specialty_needed?: string | null
          reason: string
          clinical_notes?: string | null
          urgency?: Database["public"]["Enums"]["referral_urgency"]
          status?: Database["public"]["Enums"]["referral_status"]
          rejection_reason?: string | null
          redirected_to_referral_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          center_id?: string
          patient_id?: string | null
          patient_name?: string
          patient_phone?: string | null
          patient_dob?: string | null
          specialty_needed?: string | null
          reason?: string
          clinical_notes?: string | null
          urgency?: Database["public"]["Enums"]["referral_urgency"]
          status?: Database["public"]["Enums"]["referral_status"]
          rejection_reason?: string | null
          redirected_to_referral_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      referral_messages: {
        Row: {
          id: string
          referral_id: string
          sender_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          referral_id: string
          sender_id: string
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          referral_id?: string
          sender_id?: string
          body?: string
          created_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          id: string
          referral_id: string
          scheduled_at: string
          duration_minutes: number
          location: string | null
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          referral_id: string
          scheduled_at: string
          duration_minutes?: number
          location?: string | null
          notes?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          referral_id?: string
          scheduled_at?: string
          duration_minutes?: number
          location?: string | null
          notes?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      referral_attachments: {
        Row: {
          id: string
          referral_id: string
          uploaded_by: string
          label: string | null
          storage_path: string
          mime_type: string | null
          size_bytes: number | null
          created_at: string
        }
        Insert: {
          id?: string
          referral_id: string
          uploaded_by: string
          label?: string | null
          storage_path: string
          mime_type?: string | null
          size_bytes?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          referral_id?: string
          uploaded_by?: string
          label?: string | null
          storage_path?: string
          mime_type?: string | null
          size_bytes?: number | null
          created_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          id: string
          referral_id: string
          uploaded_by: string
          title: string
          summary: string | null
          storage_path: string | null
          mime_type: string | null
          size_bytes: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          referral_id: string
          uploaded_by: string
          title: string
          summary?: string | null
          storage_path?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          referral_id?: string
          uploaded_by?: string
          title?: string | null
          summary?: string | null
          storage_path?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: Database["public"]["Enums"]["notification_type"]
          title: string
          message: string | null
          link: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type?: Database["public"]["Enums"]["notification_type"]
          title: string
          message?: string | null
          link?: string | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: Database["public"]["Enums"]["notification_type"]
          title?: string
          message?: string | null
          link?: string | null
          read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      affiliations: {
        Row: {
          id: string
          practitioner_user_id: string
          medical_center_user_id: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          practitioner_user_id: string
          medical_center_user_id: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          practitioner_user_id?: string
          medical_center_user_id?: string
          status?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: { _user_id: string; _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"] | null
      }
      redirect_referral: {
        Args: {
          p_referral_id: string
          p_new_center_id: string
          p_new_doctor_id?: string | null
          p_note?: string | null
        }
        Returns: string
      }
      list_medical_centers: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          organization_name: string | null
          address: string | null
          provider_type: Database["public"]["Enums"]["provider_type"] | null
        }[]
      }
    }
    Enums: {
      app_role: "doctor" | "medical_center" | "patient"
      provider_type: "clinic" | "medical_center" | "laboratory" | "radiology_center"
      referral_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "expired"
        | "redirected"
      referral_urgency: "routine" | "urgent" | "emergency"
      notification_type:
        | "referral_created"
        | "referral_status_changed"
        | "appointment_scheduled"
        | "report_uploaded"
        | "message_received"
        | "generic"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never