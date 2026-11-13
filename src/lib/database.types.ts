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
    PostgrestVersion: '14.5'
  }
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
      categories: {
        Row: {
          color_hex: string
          created_at: string
          household_id: string | null
          icon: string | null
          id: string
          is_default: boolean
          is_system: boolean
          name: string
          user_id: string | null
        }
        Insert: {
          color_hex?: string
          created_at?: string
          household_id?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean
          is_system?: boolean
          name: string
          user_id?: string | null
        }
        Update: {
          color_hex?: string
          created_at?: string
          household_id?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean
          is_system?: boolean
          name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'categories_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'categories_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      household_invites: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          household_id: string
          id: string
          revoked_at: string | null
          token_hash: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          household_id: string
          id?: string
          revoked_at?: string | null
          token_hash: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          household_id?: string
          id?: string
          revoked_at?: string | null
          token_hash?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'household_invites_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'household_invites_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'household_invites_used_by_fkey'
            columns: ['used_by']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          id: string
          joined_at: string
          left_at: string | null
          profile_id: string
          role: string
        }
        Insert: {
          household_id: string
          id?: string
          joined_at?: string
          left_at?: string | null
          profile_id: string
          role?: string
        }
        Update: {
          household_id?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          profile_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: 'household_members_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'household_members_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      households: {
        Row: {
          contributors_can_delete_others: boolean
          contributors_can_edit_others: boolean
          contributors_can_invite: boolean
          contributors_can_manage_categories: boolean
          created_at: string
          created_by: string | null
          currency: string
          id: string
          name: string
          period_start_day: number
          personal_owner_id: string | null
          time_zone: string | null
        }
        Insert: {
          contributors_can_delete_others?: boolean
          contributors_can_edit_others?: boolean
          contributors_can_invite?: boolean
          contributors_can_manage_categories?: boolean
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          name: string
          period_start_day?: number
          personal_owner_id?: string | null
          time_zone?: string | null
        }
        Update: {
          contributors_can_delete_others?: boolean
          contributors_can_edit_others?: boolean
          contributors_can_invite?: boolean
          contributors_can_manage_categories?: boolean
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          name?: string
          period_start_day?: number
          personal_owner_id?: string | null
          time_zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'households_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'households_personal_owner_id_fkey'
            columns: ['personal_owner_id']
            isOneToOne: true
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      recurring_transaction_occurrences: {
        Row: {
          created_at: string
          id: string
          occurrence_date: string
          recurring_transaction_id: string
          status: string
          transaction_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          occurrence_date: string
          recurring_transaction_id: string
          status: string
          transaction_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          occurrence_date?: string
          recurring_transaction_id?: string
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'recurring_transaction_occurrences_recurring_transaction_id_fkey'
            columns: ['recurring_transaction_id']
            isOneToOne: false
            referencedRelation: 'recurring_transactions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recurring_transaction_occurrences_transaction_id_fkey'
            columns: ['transaction_id']
            isOneToOne: false
            referencedRelation: 'transactions'
            referencedColumns: ['id']
          },
        ]
      }
      recurring_transactions: {
        Row: {
          active: boolean
          amount_cents: number
          category_id: string
          created_at: string
          deactivated_at: string | null
          first_due_date: string
          frequency: string
          household_id: string
          id: string
          kind: string
          monthly_nth: number | null
          monthly_rule_type: string | null
          monthly_weekday: number | null
          name: string
          user_id: string
        }
        Insert: {
          active?: boolean
          amount_cents: number
          category_id: string
          created_at?: string
          deactivated_at?: string | null
          first_due_date: string
          frequency: string
          household_id: string
          id?: string
          kind?: string
          monthly_nth?: number | null
          monthly_rule_type?: string | null
          monthly_weekday?: number | null
          name: string
          user_id: string
        }
        Update: {
          active?: boolean
          amount_cents?: number
          category_id?: string
          created_at?: string
          deactivated_at?: string | null
          first_due_date?: string
          frequency?: string
          household_id?: string
          id?: string
          kind?: string
          monthly_nth?: number | null
          monthly_rule_type?: string | null
          monthly_weekday?: number | null
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'recurring_transactions_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recurring_transactions_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recurring_transactions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      report_snapshots: {
        Row: {
          ai_summary: string | null
          category_breakdown: Json | null
          generated_at: string
          id: string
          period_key: string
          period_type: string
          total_expenses_cents: number
          total_income_cents: number
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          category_breakdown?: Json | null
          generated_at?: string
          id?: string
          period_key: string
          period_type: string
          total_expenses_cents?: number
          total_income_cents?: number
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          category_breakdown?: Json | null
          generated_at?: string
          id?: string
          period_key?: string
          period_type?: string
          total_expenses_cents?: number
          total_income_cents?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'report_snapshots_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      transactions: {
        Row: {
          amount_cents: number
          category_id: string | null
          created_at: string
          created_by: string | null
          household_id: string
          id: string
          note: string | null
          recurring_transaction_id: string | null
          transaction_date: string
          type: string
          updated_at: string
          updated_by: string | null
          user_id: string
          version: number
        }
        Insert: {
          amount_cents: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          household_id: string
          id?: string
          note?: string | null
          recurring_transaction_id?: string | null
          transaction_date?: string
          type: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
          version?: number
        }
        Update: {
          amount_cents?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          household_id?: string
          id?: string
          note?: string | null
          recurring_transaction_id?: string | null
          transaction_date?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'transactions_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_recurring_transaction_id_fkey'
            columns: ['recurring_transaction_id']
            isOneToOne: false
            referencedRelation: 'recurring_transactions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      user_profiles: {
        Row: {
          auth_user_id: string
          avatar_url: string | null
          budget_period_start_day: number
          created_at: string
          currency: string
          display_name: string | null
          email: string | null
          id: string
          monthly_budget_target: number
          onboarding_completed_at: string | null
          payday_day_of_month: number | null
          payday_frequency: string
        }
        Insert: {
          auth_user_id: string
          avatar_url?: string | null
          budget_period_start_day?: number
          created_at?: string
          currency?: string
          display_name?: string | null
          email?: string | null
          id?: string
          monthly_budget_target?: number
          onboarding_completed_at?: string | null
          payday_day_of_month?: number | null
          payday_frequency?: string
        }
        Update: {
          auth_user_id?: string
          avatar_url?: string | null
          budget_period_start_day?: number
          created_at?: string
          currency?: string
          display_name?: string | null
          email?: string | null
          id?: string
          monthly_budget_target?: number
          onboarding_completed_at?: string | null
          payday_day_of_month?: number | null
          payday_frequency?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_household_invite: { Args: { p_token: string }; Returns: string }
      create_household: {
        Args: {
          p_currency: string
          p_name: string
          p_period_start_day: number
          p_time_zone: string
        }
        Returns: string
      }
      create_household_invite: {
        Args: { p_household_id: string }
        Returns: {
          expires_at: string
          invite_id: string
          token: string
        }[]
      }
      household_people: {
        Args: { p_household_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          joined_at: string
          left_at: string
          profile_id: string
          role: string
        }[]
      }
      leave_household: {
        Args: { p_delete_if_last?: boolean; p_household_id: string }
        Returns: undefined
      }
      preview_household_invite: {
        Args: { p_token: string }
        Returns: {
          expires_at: string
          household_id: string
          household_name: string
          invited_by: string
        }[]
      }
      remove_household_member: {
        Args: { p_household_id: string; p_profile_id: string }
        Returns: undefined
      }
      revoke_household_invite: {
        Args: { p_invite_id: string }
        Returns: undefined
      }
      transfer_household_admin: {
        Args: { p_household_id: string; p_profile_id: string }
        Returns: undefined
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
