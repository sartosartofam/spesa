export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      families: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      family_invites: {
        Row: {
          code_hash: string
          created_at: string
          created_by: string
          expires_at: string
          family_id: string
          id: string
          used_at: string | null
          used_by: string | null
        }
        ComputedFields: never
        Insert: {
          code_hash: string
          created_at?: string
          created_by: string
          expires_at?: string
          family_id: string
          id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code_hash?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          family_id?: string
          id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'family_invites_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'family_invites_family_id_fkey'
            columns: ['family_id']
            isOneToOne: false
            referencedRelation: 'families'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'family_invites_used_by_fkey'
            columns: ['used_by']
            isOneToOne: false
            referencedRelation: 'members'
            referencedColumns: ['id']
          },
        ]
      }
      items: {
        Row: {
          bought_at: string | null
          category: string | null
          created_at: string
          created_by: string | null
          family_id: string
          id: string
          name: string
          note: string | null
          quantity: string | null
          status: Database['public']['Enums']['item_status']
          updated_at: string
          urgent: boolean
        }
        ComputedFields: never
        Insert: {
          bought_at?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          family_id: string
          id?: string
          name: string
          note?: string | null
          quantity?: string | null
          status?: Database['public']['Enums']['item_status']
          updated_at?: string
          urgent?: boolean
        }
        Update: {
          bought_at?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          family_id?: string
          id?: string
          name?: string
          note?: string | null
          quantity?: string | null
          status?: Database['public']['Enums']['item_status']
          updated_at?: string
          urgent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'items_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'items_family_id_fkey'
            columns: ['family_id']
            isOneToOne: false
            referencedRelation: 'families'
            referencedColumns: ['id']
          },
        ]
      }
      keepalive: {
        Row: {
          id: number
          last_ping: string | null
        }
        ComputedFields: never
        Insert: {
          id?: number
          last_ping?: string | null
        }
        Update: {
          id?: number
          last_ping?: string | null
        }
        Relationships: []
      }
      members: {
        Row: {
          created_at: string
          display_name: string
          email: string
          family_id: string
          id: string
          role: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          display_name: string
          email: string
          family_id: string
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          family_id?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: 'members_family_id_fkey'
            columns: ['family_id']
            isOneToOne: false
            referencedRelation: 'families'
            referencedColumns: ['id']
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          keys: NonNullable<Json>
          member_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          keys: NonNullable<Json>
          member_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          keys?: NonNullable<Json>
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'push_subscriptions_member_id_fkey'
            columns: ['member_id']
            isOneToOne: false
            referencedRelation: 'members'
            referencedColumns: ['id']
          },
        ]
      }
      user_settings: {
        Row: {
          settings: NonNullable<Json>
          updated_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          settings?: NonNullable<Json>
          updated_at?: string
          user_id: string
        }
        Update: {
          settings?: NonNullable<Json>
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_family_invite: {
        Args: Record<PropertyKey, never>
        Returns: {
          invite_code: string
          invite_expires_at: string
        }[]
      }
      current_family_id: { Args: Record<PropertyKey, never>; Returns: string }
      delete_current_account: { Args: Record<PropertyKey, never>; Returns: undefined }
      ensure_current_family: { Args: Record<PropertyKey, never>; Returns: string }
      leave_family: {
        Args: { p_family_id: string }
        Returns: {
          left_family_id: string
          new_family_id: string
          new_family_name: string
          new_owner_id: string
        }[]
      }
      promote_family_owner: {
        Args: { p_member_id: string }
        Returns: {
          promoted_member_id: string
          promoted_role: string
        }[]
      }
      redeem_family_invite: {
        Args: { p_code: string }
        Returns: {
          target_family_id: string
          target_family_name: string
        }[]
      }
      rename_family: {
        Args: { p_name: string }
        Returns: {
          family_id: string
          family_name: string
        }[]
      }
      restore_item: {
        Args: {
          p_bought_at: string
          p_category: string
          p_created_at: string
          p_id: string
          p_name: string
          p_note: string
          p_quantity: string
          p_status: Database['public']['Enums']['item_status']
          p_urgent: boolean
        }
        Returns: {
          bought_at: string | null
          category: string | null
          created_at: string
          created_by: string | null
          family_id: string
          id: string
          name: string
          note: string | null
          quantity: string | null
          status: Database['public']['Enums']['item_status']
          updated_at: string
          urgent: boolean
        }
        SetofOptions: {
          from: '*'
          to: 'items'
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      item_status: 'to_buy' | 'bought'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      item_status: ['to_buy', 'bought'],
    },
  },
} as const
