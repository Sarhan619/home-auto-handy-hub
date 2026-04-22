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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          accepted_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          category_id: string
          commission_pct: number | null
          completed_at: string | null
          created_at: string
          customer_id: string
          customer_name: string | null
          customer_phone: string | null
          dispatch_mode: Database["public"]["Enums"]["dispatch_mode"]
          final_price: number | null
          id: string
          is_paid: boolean
          job_address: string
          job_lat: number
          job_lng: number
          notes: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          price_adjustment_note: string | null
          quoted_price: number | null
          scheduled_for: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          category_id: string
          commission_pct?: number | null
          completed_at?: string | null
          created_at?: string
          customer_id: string
          customer_name?: string | null
          customer_phone?: string | null
          dispatch_mode?: Database["public"]["Enums"]["dispatch_mode"]
          final_price?: number | null
          id?: string
          is_paid?: boolean
          job_address: string
          job_lat: number
          job_lng: number
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          price_adjustment_note?: string | null
          quoted_price?: number | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          category_id?: string
          commission_pct?: number | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          customer_name?: string | null
          customer_phone?: string | null
          dispatch_mode?: Database["public"]["Enums"]["dispatch_mode"]
          final_price?: number | null
          id?: string
          is_paid?: boolean
          job_address?: string
          job_lat?: number
          job_lng?: number
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          price_adjustment_note?: string | null
          quoted_price?: number | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          booking_id: string
          commission_amount: number
          commission_pct: number
          created_at: string
          gross_amount: number
          id: string
          settled_at: string | null
          settled_by: string | null
          settlement_note: string | null
          status: Database["public"]["Enums"]["commission_status"]
          updated_at: string
          vendor_id: string
          vendor_net: number
        }
        Insert: {
          booking_id: string
          commission_amount: number
          commission_pct: number
          created_at?: string
          gross_amount: number
          id?: string
          settled_at?: string | null
          settled_by?: string | null
          settlement_note?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
          vendor_id: string
          vendor_net: number
        }
        Update: {
          booking_id?: string
          commission_amount?: number
          commission_pct?: number
          created_at?: string
          gross_amount?: number
          id?: string
          settled_at?: string | null
          settled_by?: string | null
          settlement_note?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
          vendor_id?: string
          vendor_net?: number
        }
        Relationships: [
          {
            foreignKeyName: "commissions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          rating: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          rating: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          rating?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string
          default_commission_pct: number
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          default_commission_pct?: number
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          default_commission_pct?: number
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_services: {
        Row: {
          base_price: number | null
          category_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          price_type: Database["public"]["Enums"]["price_type"]
          vendor_id: string
        }
        Insert: {
          base_price?: number | null
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          price_type?: Database["public"]["Enums"]["price_type"]
          vendor_id: string
        }
        Update: {
          base_price?: number | null
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          price_type?: Database["public"]["Enums"]["price_type"]
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_services_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          avg_rating: number | null
          base_address: string | null
          base_lat: number | null
          base_lng: number | null
          bio: string | null
          business_name: string
          created_at: string
          id: string
          insurance_doc_path: string | null
          is_online: boolean
          license_doc_path: string | null
          logo_url: string | null
          phone: string | null
          rejection_reason: string | null
          service_radius_km: number
          total_jobs: number
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          avg_rating?: number | null
          base_address?: string | null
          base_lat?: number | null
          base_lng?: number | null
          bio?: string | null
          business_name: string
          created_at?: string
          id?: string
          insurance_doc_path?: string | null
          is_online?: boolean
          license_doc_path?: string | null
          logo_url?: string | null
          phone?: string | null
          rejection_reason?: string | null
          service_radius_km?: number
          total_jobs?: number
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          avg_rating?: number | null
          base_address?: string | null
          base_lat?: number | null
          base_lng?: number | null
          bio?: string | null
          business_name?: string
          created_at?: string
          id?: string
          insurance_doc_path?: string | null
          is_online?: boolean
          license_doc_path?: string | null
          logo_url?: string | null
          phone?: string | null
          rejection_reason?: string | null
          service_radius_km?: number
          total_jobs?: number
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_broadcast_booking: {
        Args: { _booking_id: string }
        Returns: {
          accepted_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          category_id: string
          commission_pct: number | null
          completed_at: string | null
          created_at: string
          customer_id: string
          customer_name: string | null
          customer_phone: string | null
          dispatch_mode: Database["public"]["Enums"]["dispatch_mode"]
          final_price: number | null
          id: string
          is_paid: boolean
          job_address: string
          job_lat: number
          job_lng: number
          notes: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          price_adjustment_note: string | null
          quoted_price: number | null
          scheduled_for: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          vendor_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      distance_km: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      get_my_roles: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recompute_vendor_rating: {
        Args: { _vendor_id: string }
        Returns: undefined
      }
      search_vendors_for_job: {
        Args: { _category_id: string; _lat: number; _lng: number }
        Returns: {
          avg_rating: number
          base_price: number
          bio: string
          business_name: string
          distance_km: number
          is_online: boolean
          logo_url: string
          price_type: Database["public"]["Enums"]["price_type"]
          service_description: string
          total_jobs: number
          vendor_id: string
        }[]
      }
      vendor_set_booking_payment: {
        Args: {
          _adjustment_note?: string
          _booking_id: string
          _final_price: number
          _payment_method: Database["public"]["Enums"]["payment_method"]
        }
        Returns: {
          accepted_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          category_id: string
          commission_pct: number | null
          completed_at: string | null
          created_at: string
          customer_id: string
          customer_name: string | null
          customer_phone: string | null
          dispatch_mode: Database["public"]["Enums"]["dispatch_mode"]
          final_price: number | null
          id: string
          is_paid: boolean
          job_address: string
          job_lat: number
          job_lng: number
          notes: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          price_adjustment_note: string | null
          quoted_price: number | null
          scheduled_for: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          vendor_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "customer" | "vendor" | "admin"
      booking_status:
        | "requested"
        | "accepted"
        | "en_route"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "declined"
        | "expired"
      commission_status: "owed" | "settled"
      dispatch_mode: "broadcast" | "direct"
      payment_method: "cash" | "bank_transfer" | "card_on_site" | "other"
      price_type: "fixed" | "hourly" | "quote"
      verification_status: "pending" | "approved" | "rejected"
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
      app_role: ["customer", "vendor", "admin"],
      booking_status: [
        "requested",
        "accepted",
        "en_route",
        "in_progress",
        "completed",
        "cancelled",
        "declined",
        "expired",
      ],
      commission_status: ["owed", "settled"],
      dispatch_mode: ["broadcast", "direct"],
      payment_method: ["cash", "bank_transfer", "card_on_site", "other"],
      price_type: ["fixed", "hourly", "quote"],
      verification_status: ["pending", "approved", "rejected"],
    },
  },
} as const
