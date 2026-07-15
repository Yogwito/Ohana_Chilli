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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      addon_recommendations: {
        Row: {
          addon_id: string
          category_id: string
          id: string
          sort_order: number
        }
        Insert: {
          addon_id: string
          category_id: string
          id?: string
          sort_order?: number
        }
        Update: {
          addon_id?: string
          category_id?: string
          id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "addon_recommendations_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addon_recommendations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      addons: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          price_cents: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price_cents?: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          sort_order?: number
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      bowl_rules: {
        Row: {
          accompaniments: number
          bases: number
          name: string
          price_cents: number
          proteins: number
          size: string
        }
        Insert: {
          accompaniments?: number
          bases?: number
          name: string
          price_cents?: number
          proteins?: number
          size: string
        }
        Update: {
          accompaniments?: number
          bases?: number
          name?: string
          price_cents?: number
          proteins?: number
          size?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          brand_id: string
          icon: string | null
          id: string
          name: string
          slug: string | null
          sort_order: number | null
        }
        Insert: {
          brand_id: string
          icon?: string | null
          id: string
          name: string
          slug?: string | null
          sort_order?: number | null
        }
        Update: {
          brand_id?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          created_at: string
          fee_cents: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          fee_cents?: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          fee_cents?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          calories: number | null
          id: string
          is_active: boolean
          is_gluten_free: boolean | null
          is_vegan: boolean | null
          name: string
          price_cents: number
          type: string
        }
        Insert: {
          calories?: number | null
          id: string
          is_active?: boolean
          is_gluten_free?: boolean | null
          is_vegan?: boolean | null
          name: string
          price_cents?: number
          type: string
        }
        Update: {
          calories?: number | null
          id?: string
          is_active?: boolean
          is_gluten_free?: boolean | null
          is_vegan?: boolean | null
          name?: string
          price_cents?: number
          type?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          brand_id: string | null
          details: Json | null
          id: string
          name: string
          order_id: string
          quantity: number
          unit_price_cents: number
        }
        Insert: {
          brand_id?: string | null
          details?: Json | null
          id?: string
          name: string
          order_id: string
          quantity?: number
          unit_price_cents?: number
        }
        Update: {
          brand_id?: string | null
          details?: Json | null
          id?: string
          name?: string
          order_id?: string
          quantity?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          created_at: string
          customer_name: string
          delivery_fee_cents: number
          delivery_zone: string | null
          id: string
          notes: string | null
          order_type: string
          paid_at: string | null
          payment_method: string | null
          payment_provider: string | null
          payment_reference: string | null
          payment_status: string
          payment_transaction_id: string | null
          phone: string
          status: string
          total_cents: number
          updated_at: string
          whatsapp_sent: boolean
        }
        Insert: {
          address?: string | null
          created_at?: string
          customer_name: string
          delivery_fee_cents?: number
          delivery_zone?: string | null
          id?: string
          notes?: string | null
          order_type: string
          paid_at?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string
          payment_transaction_id?: string | null
          phone: string
          status?: string
          total_cents?: number
          updated_at?: string
          whatsapp_sent?: boolean
        }
        Update: {
          address?: string | null
          created_at?: string
          customer_name?: string
          delivery_fee_cents?: number
          delivery_zone?: string | null
          id?: string
          notes?: string | null
          order_type?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string
          payment_transaction_id?: string | null
          phone?: string
          status?: string
          total_cents?: number
          updated_at?: string
          whatsapp_sent?: boolean
        }
        Relationships: []
      }
      product_default_ingredients: {
        Row: {
          created_at: string | null
          extra_price_cents: number
          id: string
          ingredient_name: string
          is_extra: boolean
          is_removable: boolean
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string | null
          extra_price_cents?: number
          id?: string
          ingredient_name: string
          is_extra?: boolean
          is_removable?: boolean
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string | null
          extra_price_cents?: number
          id?: string
          ingredient_name?: string
          is_extra?: boolean
          is_removable?: boolean
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_default_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          price_delta_cents: number
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price_delta_cents?: number
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price_delta_cents?: number
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string
          calories: number | null
          category_id: string
          description: string | null
          id: string
          image_url: string | null
          ingredients_list: string[] | null
          is_active: boolean
          is_gluten_free: boolean
          is_new: boolean
          is_popular: boolean
          is_vegan: boolean
          name: string
          price_cents: number
        }
        Insert: {
          brand_id: string
          calories?: number | null
          category_id: string
          description?: string | null
          id?: string
          image_url?: string | null
          ingredients_list?: string[] | null
          is_active?: boolean
          is_gluten_free?: boolean
          is_new?: boolean
          is_popular?: boolean
          is_vegan?: boolean
          name: string
          price_cents?: number
        }
        Update: {
          brand_id?: string
          calories?: number | null
          category_id?: string
          description?: string | null
          id?: string
          image_url?: string | null
          ingredients_list?: string[] | null
          is_active?: boolean
          is_gluten_free?: boolean
          is_new?: boolean
          is_popular?: boolean
          is_vegan?: boolean
          name?: string
          price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          badge_text: string | null
          created_at: string | null
          cta_text: string | null
          cta_url: string | null
          days_of_week: number[] | null
          description: string | null
          discount_type: string
          discount_value: number | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          price_cents: number | null
          sort_order: number | null
          starts_at: string | null
          title: string
          type: string
        }
        Insert: {
          badge_text?: string | null
          created_at?: string | null
          cta_text?: string | null
          cta_url?: string | null
          days_of_week?: number[] | null
          description?: string | null
          discount_type: string
          discount_value?: number | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          price_cents?: number | null
          sort_order?: number | null
          starts_at?: string | null
          title: string
          type?: string
        }
        Update: {
          badge_text?: string | null
          created_at?: string | null
          cta_text?: string | null
          cta_url?: string | null
          days_of_week?: number[] | null
          description?: string | null
          discount_type?: string
          discount_value?: number | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          price_cents?: number | null
          sort_order?: number | null
          starts_at?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_order_with_items: {
        Args: {
          p_address?: string
          p_customer_name: string
          p_delivery_fee_cents?: number
          p_delivery_zone?: string
          p_items?: Json
          p_notes?: string
          p_order_type: string
          p_payment_method?: string
          p_phone: string
          p_total_cents?: number
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
