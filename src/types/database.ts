/**
 * Generado desde el esquema real:
 *   npx supabase gen types typescript --project-id ygtlkxwlbxahpqcztxcm
 *
 * NO editar a mano. Si cambia la base, se regenera.
 * Los atajos de la app van al final del archivo.
 */

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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      cash_movements: {
        Row: {
          amount: number
          cash_session_id: string
          created_at: string
          id: string
          reason: string
          type: Database["public"]["Enums"]["cash_movement_type"]
          user_id: string | null
        }
        Insert: {
          amount: number
          cash_session_id: string
          created_at?: string
          id?: string
          reason: string
          type: Database["public"]["Enums"]["cash_movement_type"]
          user_id?: string | null
        }
        Update: {
          amount?: number
          cash_session_id?: string
          created_at?: string
          id?: string
          reason?: string
          type?: Database["public"]["Enums"]["cash_movement_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          counted_amount: number | null
          difference: number | null
          expected_amount: number | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string
          opening_amount: number
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          counted_amount?: number | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by: string
          opening_amount?: number
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          counted_amount?: number | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string
          opening_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "cash_sessions_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_sessions_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          position: number
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          position?: number
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          position?: number
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          doc_number: string | null
          doc_type: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          doc_number?: string | null
          doc_type?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          doc_number?: string | null
          doc_type?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          id: string
          note: string | null
          quantity: number
          sale_id: string | null
          stock_after: number
          type: Database["public"]["Enums"]["movement_type"]
          user_id: string | null
          variant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          quantity: number
          sale_id?: string | null
          stock_after: number
          type: Database["public"]["Enums"]["movement_type"]
          user_id?: string | null
          variant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          quantity?: number
          sale_id?: string | null
          stock_after?: number
          type?: Database["public"]["Enums"]["movement_type"]
          user_id?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "v_labels_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          barcode_source: Database["public"]["Enums"]["barcode_source"] | null
          color: string
          cost_price: number
          created_at: string
          id: string
          is_active: boolean
          label_printed: boolean
          low_stock_threshold: number
          product_id: string
          sale_price: number
          size: string
          sku: string | null
          stock: number
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          barcode_source?: Database["public"]["Enums"]["barcode_source"] | null
          color: string
          cost_price?: number
          created_at?: string
          id?: string
          is_active?: boolean
          label_printed?: boolean
          low_stock_threshold?: number
          product_id: string
          sale_price?: number
          size: string
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          barcode_source?: Database["public"]["Enums"]["barcode_source"] | null
          color?: string
          cost_price?: number
          created_at?: string
          id?: string
          is_active?: boolean
          label_printed?: boolean
          low_stock_threshold?: number
          product_id?: string
          sale_price?: number
          size?: string
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          images: string[]
          is_active: boolean
          is_featured: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          is_active?: boolean
          is_featured?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          is_active?: boolean
          is_featured?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          color: string | null
          discount: number
          id: string
          product_name: string
          quantity: number
          sale_id: string
          size: string | null
          sku: string | null
          unit_cost: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          color?: string | null
          discount?: number
          id?: string
          product_name: string
          quantity: number
          sale_id: string
          size?: string | null
          sku?: string | null
          unit_cost?: number
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          color?: string | null
          discount?: number
          id?: string
          product_name?: string
          quantity?: number
          sale_id?: string
          size?: string | null
          sku?: string | null
          unit_cost?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "v_labels_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_payments: {
        Row: {
          amount: number
          change_due: number | null
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          received: number | null
          reference: string | null
          sale_id: string
        }
        Insert: {
          amount: number
          change_due?: number | null
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          received?: number | null
          reference?: string | null
          sale_id: string
        }
        Update: {
          amount?: number
          change_due?: number | null
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          received?: number | null
          reference?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_returns: {
        Row: {
          amount: number
          color: string | null
          created_at: string
          id: string
          product_name: string
          quantity: number
          reason: string
          sale_id: string
          sale_item_id: string | null
          size: string | null
          user_id: string | null
          variant_id: string | null
        }
        Insert: {
          amount: number
          color?: string | null
          created_at?: string
          id?: string
          product_name: string
          quantity: number
          reason: string
          sale_id: string
          sale_item_id?: string | null
          size?: string | null
          user_id?: string | null
          variant_id?: string | null
        }
        Update: {
          amount?: number
          color?: string | null
          created_at?: string
          id?: string
          product_name?: string
          quantity?: number
          reason?: string
          sale_id?: string
          sale_item_id?: string | null
          size?: string | null
          user_id?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_returns_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_returns_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_returns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_returns_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cash_session_id: string | null
          cashier_id: string | null
          channel: Database["public"]["Enums"]["sale_channel"]
          created_at: string
          customer_id: string | null
          dian_cufe: string | null
          dian_number: string | null
          dian_prefix: string | null
          dian_response: Json | null
          dian_status: string | null
          discount: number
          id: string
          notes: string | null
          number: string
          paid_at: string | null
          status: Database["public"]["Enums"]["sale_status"]
          subtotal: number
          total: number
          voided_at: string | null
        }
        Insert: {
          cash_session_id?: string | null
          cashier_id?: string | null
          channel: Database["public"]["Enums"]["sale_channel"]
          created_at?: string
          customer_id?: string | null
          dian_cufe?: string | null
          dian_number?: string | null
          dian_prefix?: string | null
          dian_response?: Json | null
          dian_status?: string | null
          discount?: number
          id?: string
          notes?: string | null
          number?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          total?: number
          voided_at?: string | null
        }
        Update: {
          cash_session_id?: string | null
          cashier_id?: string | null
          channel?: Database["public"]["Enums"]["sale_channel"]
          created_at?: string
          customer_id?: string | null
          dian_cufe?: string | null
          dian_number?: string | null
          dian_prefix?: string | null
          dian_response?: Json | null
          dian_status?: string | null
          discount?: number
          id?: string
          notes?: string | null
          number?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          total?: number
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          address: string | null
          id: boolean
          receipt_footer: string | null
          schedule: string | null
          slogan: string | null
          store_name: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          id?: boolean
          receipt_footer?: string | null
          schedule?: string | null
          slogan?: string | null
          store_name?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          id?: boolean
          receipt_footer?: string | null
          schedule?: string | null
          slogan?: string | null
          store_name?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_catalog: {
        Row: {
          category_id: string | null
          colors: string[] | null
          description: string | null
          id: string | null
          images: string[] | null
          is_featured: boolean | null
          name: string | null
          price_from: number | null
          price_to: number | null
          price_varies: boolean | null
          sizes: string[] | null
          slug: string | null
          total_stock: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      v_daily_sales: {
        Row: {
          costo: number | null
          descuentos: number | null
          dia: string | null
          margen: number | null
          total: number | null
          ventas: number | null
        }
        Relationships: []
      }
      v_labels_pending: {
        Row: {
          barcode: string | null
          color: string | null
          id: string | null
          product: string | null
          sale_price: number | null
          size: string | null
          sku: string | null
          stock: number | null
        }
        Relationships: []
      }
      v_low_stock: {
        Row: {
          color: string | null
          id: string | null
          low_stock_threshold: number | null
          product: string | null
          sale_price: number | null
          size: string | null
          sku: string | null
          stock: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      adjust_stock: {
        Args: {
          p_note?: string
          p_quantity: number
          p_type?: Database["public"]["Enums"]["movement_type"]
          p_variant_id: string
        }
        Returns: number
      }
      cash_esperado: { Args: { p_session: string }; Returns: number }
      cash_session_summary: {
        Args: { p_session_id?: string }
        Returns: {
          abierta_desde: string
          bancolombia: number
          base: number
          cajero: string
          daviplata: number
          efectivo: number
          entradas: number
          esperado_en_caja: number
          nequi: number
          salidas: number
          session_id: string
          tarjeta: number
          total_vendido: number
          ventas: number
        }[]
      }
      close_cash_session: {
        Args: { p_counted: number; p_notes?: string }
        Returns: {
          closed_at: string | null
          closed_by: string | null
          counted_amount: number | null
          difference: number | null
          expected_amount: number | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string
          opening_amount: number
        }
        SetofOptions: {
          from: "*"
          to: "cash_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_web_order: {
        Args: {
          p_method: Database["public"]["Enums"]["payment_method"]
          p_sale_id: string
        }
        Returns: {
          cash_session_id: string | null
          cashier_id: string | null
          channel: Database["public"]["Enums"]["sale_channel"]
          created_at: string
          customer_id: string | null
          dian_cufe: string | null
          dian_number: string | null
          dian_prefix: string | null
          dian_response: Json | null
          dian_status: string | null
          discount: number
          id: string
          notes: string | null
          number: string
          paid_at: string | null
          status: Database["public"]["Enums"]["sale_status"]
          subtotal: number
          total: number
          voided_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "sales"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_pos_sale: {
        Args: {
          p_customer_id?: string
          p_discount?: number
          p_items: Json
          p_notes?: string
          p_payments: Json
        }
        Returns: {
          cash_session_id: string | null
          cashier_id: string | null
          channel: Database["public"]["Enums"]["sale_channel"]
          created_at: string
          customer_id: string | null
          dian_cufe: string | null
          dian_number: string | null
          dian_prefix: string | null
          dian_response: Json | null
          dian_status: string | null
          discount: number
          id: string
          notes: string | null
          number: string
          paid_at: string | null
          status: Database["public"]["Enums"]["sale_status"]
          subtotal: number
          total: number
          voided_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "sales"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_web_order: {
        Args: { p_customer: Json; p_items: Json }
        Returns: {
          cash_session_id: string | null
          cashier_id: string | null
          channel: Database["public"]["Enums"]["sale_channel"]
          created_at: string
          customer_id: string | null
          dian_cufe: string | null
          dian_number: string | null
          dian_prefix: string | null
          dian_response: Json | null
          dian_status: string | null
          discount: number
          id: string
          notes: string | null
          number: string
          paid_at: string | null
          status: Database["public"]["Enums"]["sale_status"]
          subtotal: number
          total: number
          voided_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "sales"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ean13_check_digit: { Args: { p_twelve: string }; Returns: string }
      find_by_barcode: {
        Args: { p_code: string }
        Returns: {
          barcode: string
          color: string
          images: string[]
          product_id: string
          product_name: string
          sale_price: number
          size: string
          sku: string
          stock: number
          variant_id: string
        }[]
      }
      generate_internal_barcode: { Args: never; Returns: string }
      generate_sku: {
        Args: { p_color: string; p_product_id: string; p_size: string }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      open_cash_session: {
        Args: { p_opening?: number }
        Returns: {
          closed_at: string | null
          closed_by: string | null
          counted_amount: number | null
          difference: number | null
          expected_amount: number | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string
          opening_amount: number
        }
        SetofOptions: {
          from: "*"
          to: "cash_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      register_cash_movement: {
        Args: {
          p_monto: number
          p_motivo: string
          p_tipo: Database["public"]["Enums"]["cash_movement_type"]
        }
        Returns: {
          amount: number
          cash_session_id: string
          created_at: string
          id: string
          reason: string
          type: Database["public"]["Enums"]["cash_movement_type"]
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "cash_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reporte_por_dia: {
        Args: { p_desde: string; p_hasta: string }
        Returns: {
          costo: number
          dia: string
          ingresos: number
          margen: number
          ventas: number
        }[]
      }
      reporte_por_metodo: {
        Args: { p_desde: string; p_hasta: string }
        Returns: {
          cobros: number
          metodo: string
          total: number
        }[]
      }
      reporte_resumen: {
        Args: { p_desde: string; p_hasta: string }
        Returns: {
          costo: number
          descuentos: number
          devoluciones: number
          ingresos: number
          margen: number
          ticket_promedio: number
          unidades: number
          ventas: number
        }[]
      }
      reporte_top_prendas: {
        Args: { p_desde: string; p_hasta: string; p_limite?: number }
        Returns: {
          color: string
          ingresos: number
          margen: number
          producto: string
          talla: string
          unidades: number
        }[]
      }
      return_sale_items: {
        Args: {
          p_items: Json
          p_motivo: string
          p_reintegro_efectivo?: boolean
          p_sale_id: string
        }
        Returns: number
      }
      set_price_by_size: {
        Args: { p_prices: Json; p_product_id: string }
        Returns: number
      }
      set_product_price: {
        Args: { p_price: number; p_product_id: string }
        Returns: number
      }
      void_sale: {
        Args: { p_motivo: string; p_sale_id: string }
        Returns: {
          cash_session_id: string | null
          cashier_id: string | null
          channel: Database["public"]["Enums"]["sale_channel"]
          created_at: string
          customer_id: string | null
          dian_cufe: string | null
          dian_number: string | null
          dian_prefix: string | null
          dian_response: Json | null
          dian_status: string | null
          discount: number
          id: string
          notes: string | null
          number: string
          paid_at: string | null
          status: Database["public"]["Enums"]["sale_status"]
          subtotal: number
          total: number
          voided_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "sales"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      barcode_source: "fabrica" | "interno"
      cash_movement_type: "entrada" | "salida"
      movement_type: "venta" | "devolucion" | "entrada" | "ajuste" | "merma"
      payment_method:
        | "efectivo"
        | "nequi"
        | "daviplata"
        | "bancolombia"
        | "tarjeta"
      sale_channel: "pos" | "web"
      sale_status: "pendiente" | "pagada" | "anulada"
      user_role: "admin" | "cajero"
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
      barcode_source: ["fabrica", "interno"],
      cash_movement_type: ["entrada", "salida"],
      movement_type: ["venta", "devolucion", "entrada", "ajuste", "merma"],
      payment_method: [
        "efectivo",
        "nequi",
        "daviplata",
        "bancolombia",
        "tarjeta",
      ],
      sale_channel: ["pos", "web"],
      sale_status: ["pendiente", "pagada", "anulada"],
      user_role: ["admin", "cajero"],
    },
  },
} as const

// ---------------------------------------------------------------------
// Atajos de la app. Lo único escrito a mano en este archivo: sobreviven
// a una regeneración porque van después del bloque generado.
// ---------------------------------------------------------------------

export type RolUsuario = Database["public"]["Enums"]["user_role"]
export type MetodoPago = Database["public"]["Enums"]["payment_method"]
export type EstadoVenta = Database["public"]["Enums"]["sale_status"]
export type CanalVenta = Database["public"]["Enums"]["sale_channel"]
export type TipoMovimiento = Database["public"]["Enums"]["movement_type"]

export type Perfil = Tables<"profiles">
export type Producto = Tables<"products">
export type Variante = Tables<"product_variants">
export type Venta = Tables<"sales">
export type ItemVenta = Tables<"sale_items">
export type PagoVenta = Tables<"sale_payments">
export type Cliente = Tables<"customers">
export type TurnoCaja = Tables<"cash_sessions">
export type ConfiguracionTienda = Tables<"store_settings">
