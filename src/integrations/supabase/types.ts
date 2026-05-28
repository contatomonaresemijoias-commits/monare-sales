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
      ciclos_mostruario: {
        Row: {
          aberto_em: string
          created_at: string
          fechado_em: string | null
          id: string
          observacao: string | null
          parceira_id: string
          total_comissao: number
          total_vendas: number
        }
        Insert: {
          aberto_em?: string
          created_at?: string
          fechado_em?: string | null
          id?: string
          observacao?: string | null
          parceira_id: string
          total_comissao?: number
          total_vendas?: number
        }
        Update: {
          aberto_em?: string
          created_at?: string
          fechado_em?: string | null
          id?: string
          observacao?: string | null
          parceira_id?: string
          total_comissao?: number
          total_vendas?: number
        }
        Relationships: [
          {
            foreignKeyName: "ciclos_mostruario_parceira_id_fkey"
            columns: ["parceira_id"]
            isOneToOne: false
            referencedRelation: "parceiras"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_parceiras: {
        Row: {
          created_at: string
          id: string
          parceira_id: string
          produto_id: string
          quantidade: number
          quantidade_vendida: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          parceira_id: string
          produto_id: string
          quantidade?: number
          quantidade_vendida?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          parceira_id?: string
          produto_id?: string
          quantidade?: number
          quantidade_vendida?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_parceiras_parceira_id_fkey"
            columns: ["parceira_id"]
            isOneToOne: false
            referencedRelation: "parceiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_parceiras_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      parceiras: {
        Row: {
          ativa: boolean
          comissao_percentual: number
          created_at: string
          id: string
          nome: string
          whatsapp: string | null
        }
        Insert: {
          ativa?: boolean
          comissao_percentual?: number
          created_at?: string
          id?: string
          nome: string
          whatsapp?: string | null
        }
        Update: {
          ativa?: boolean
          comissao_percentual?: number
          created_at?: string
          id?: string
          nome?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      produtos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          preco_venda: number
          sku: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          preco_venda?: number
          sku: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          preco_venda?: number
          sku?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          parceira_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          parceira_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          parceira_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_parceira_id_fkey"
            columns: ["parceira_id"]
            isOneToOne: false
            referencedRelation: "parceiras"
            referencedColumns: ["id"]
          },
        ]
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
      vendas: {
        Row: {
          ciclo_id: string | null
          cliente_nome: string
          cliente_whatsapp: string
          codigo_garantia: string
          comissao_percentual: number | null
          comissao_valor: number | null
          created_at: string
          data_venda: string
          estoque_id: string | null
          id: string
          ip_venda: string | null
          parceira_id: string | null
          produto_id: string | null
          produto_nome: string
          termo_aceito: boolean
          validade_garantia: string | null
          valor_venda: number | null
        }
        Insert: {
          ciclo_id?: string | null
          cliente_nome: string
          cliente_whatsapp: string
          codigo_garantia: string
          comissao_percentual?: number | null
          comissao_valor?: number | null
          created_at?: string
          data_venda: string
          estoque_id?: string | null
          id?: string
          ip_venda?: string | null
          parceira_id?: string | null
          produto_id?: string | null
          produto_nome: string
          termo_aceito?: boolean
          validade_garantia?: string | null
          valor_venda?: number | null
        }
        Update: {
          ciclo_id?: string | null
          cliente_nome?: string
          cliente_whatsapp?: string
          codigo_garantia?: string
          comissao_percentual?: number | null
          comissao_valor?: number | null
          created_at?: string
          data_venda?: string
          estoque_id?: string | null
          id?: string
          ip_venda?: string | null
          parceira_id?: string | null
          produto_id?: string | null
          produto_nome?: string
          termo_aceito?: boolean
          validade_garantia?: string | null
          valor_venda?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_mostruario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_estoque_id_fkey"
            columns: ["estoque_id"]
            isOneToOne: false
            referencedRelation: "estoque_parceiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_parceira_id_fkey"
            columns: ["parceira_id"]
            isOneToOne: false
            referencedRelation: "parceiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_parceira_id: { Args: never; Returns: string }
      fechar_ciclo: {
        Args: { _observacao?: string; _parceira_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      lookup_certificate: {
        Args: { _id: string }
        Returns: {
          cliente_nome: string
          codigo_garantia: string
          created_at: string
          data_venda: string
          id: string
          produto_nome: string
        }[]
      }
      saldo_ciclo_aberto: {
        Args: { _parceira_id: string }
        Returns: {
          aberto_em: string
          ciclo_id: string
          qtd_vendas: number
          total_comissao: number
          total_vendas: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "parceira" | "vendedora"
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
      app_role: ["admin", "parceira", "vendedora"],
    },
  },
} as const
