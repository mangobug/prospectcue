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
      audit_capabilities: {
        Row: {
          expires_at: string
          run_id: string
          token_hash: string
        }
        Insert: {
          expires_at?: string
          run_id: string
          token_hash: string
        }
        Update: {
          expires_at?: string
          run_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_capabilities_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: true
            referencedRelation: "audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          has_screenshot: boolean
          id: string
          prospect_id: string
          report: Json | null
          requested_by: string | null
          requested_url: string
          started_at: string | null
          status: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          has_screenshot?: boolean
          id?: string
          prospect_id: string
          report?: Json | null
          requested_by?: string | null
          requested_url: string
          started_at?: string | null
          status?: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          has_screenshot?: boolean
          id?: string
          prospect_id?: string
          report?: Json | null
          requested_by?: string | null
          requested_url?: string
          started_at?: string | null
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_runs_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_places: {
        Row: {
          address: string
          attributions: Json
          business_name: string
          categories: string[]
          city: string
          country: string
          id: string
          imported_at: string
          industry: string
          latitude: number
          longitude: number
          phone: string | null
          province: string
          release: string
          website_url: string | null
        }
        Insert: {
          address?: string
          attributions?: Json
          business_name: string
          categories?: string[]
          city?: string
          country?: string
          id: string
          imported_at?: string
          industry?: string
          latitude: number
          longitude: number
          phone?: string | null
          province?: string
          release: string
          website_url?: string | null
        }
        Update: {
          address?: string
          attributions?: Json
          business_name?: string
          categories?: string[]
          city?: string
          country?: string
          id?: string
          imported_at?: string
          industry?: string
          latitude?: number
          longitude?: number
          phone?: string | null
          province?: string
          release?: string
          website_url?: string | null
        }
        Relationships: []
      }
      import_batches: {
        Row: {
          completed_at: string
          created_at: string
          created_by: string
          filename: string
          id: string
          idempotency_key: string
          imported_count: number
          invalid_count: number
          request_hash: string
          results: Json
          skipped_count: number
          status: string
          total_count: number
          workspace_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          created_by: string
          filename: string
          id?: string
          idempotency_key: string
          imported_count: number
          invalid_count: number
          request_hash: string
          results?: Json
          skipped_count: number
          status: string
          total_count: number
          workspace_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          created_by?: string
          filename?: string
          id?: string
          idempotency_key?: string
          imported_count?: number
          invalid_count?: number
          request_hash?: string
          results?: Json
          skipped_count?: number
          status?: string
          total_count?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batches_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      prospect_activities: {
        Row: {
          change_data: Json | null
          created_at: string
          created_by: string
          id: string
          note: string | null
          prospect_id: string
          type: string
          workspace_id: string
        }
        Insert: {
          change_data?: Json | null
          created_at?: string
          created_by: string
          id?: string
          note?: string | null
          prospect_id: string
          type: string
          workspace_id: string
        }
        Update: {
          change_data?: Json | null
          created_at?: string
          created_by?: string
          id?: string
          note?: string | null
          prospect_id?: string
          type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_activities_workspace_id_prospect_id_fkey"
            columns: ["workspace_id", "prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["workspace_id", "id"]
          },
        ]
      }
      prospects: {
        Row: {
          business_name: string
          city: string
          country: string
          created_at: string
          created_by: string
          discovery_attributions: Json
          discovery_id: string | null
          email: string | null
          id: string
          industry: string
          next_follow_up: string | null
          phone: string | null
          province: string
          source_reference: string | null
          source_type: string
          stage: Database["public"]["Enums"]["pipeline_stage"]
          updated_at: string
          verification_status: string
          verified_at: string | null
          website_status: Database["public"]["Enums"]["website_status"]
          website_url: string | null
          workspace_id: string
        }
        Insert: {
          business_name: string
          city?: string
          country?: string
          created_at?: string
          created_by: string
          discovery_attributions?: Json
          discovery_id?: string | null
          email?: string | null
          id?: string
          industry?: string
          next_follow_up?: string | null
          phone?: string | null
          province?: string
          source_reference?: string | null
          source_type: string
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          website_status?: Database["public"]["Enums"]["website_status"]
          website_url?: string | null
          workspace_id: string
        }
        Update: {
          business_name?: string
          city?: string
          country?: string
          created_at?: string
          created_by?: string
          discovery_attributions?: Json
          discovery_id?: string | null
          email?: string | null
          id?: string
          industry?: string
          next_follow_up?: string | null
          phone?: string | null
          province?: string
          source_reference?: string | null
          source_type?: string
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          website_status?: Database["public"]["Enums"]["website_status"]
          website_url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_memberships: {
        Row: {
          created_at: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_memberships_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_website_audit: {
        Args: { capability: string; r: string }
        Returns: Json
      }
      create_workspace: { Args: { workspace_name: string }; Returns: string }
      discovery_catalogue_status: { Args: never; Returns: Json }
      duplicate_candidates: {
        Args: { keys: string[]; w: string }
        Returns: {
          business_name: string
          id: string
          key: string
        }[]
      }
      duplicate_key: {
        Args: { c: string; co: string; n: string; p: string }
        Returns: string
      }
      fail_audit_dispatch: { Args: { r: string }; Returns: undefined }
      finish_website_audit: {
        Args: {
          capability: string
          failure?: string
          r: string
          result: Json
          screenshot: boolean
        }
        Returns: boolean
      }
      import_prospects: {
        Args: {
          filename: string
          invalid_count: number
          rows: Json
          token: string
          w: string
        }
        Returns: {
          completed_at: string
          created_at: string
          created_by: string
          filename: string
          id: string
          idempotency_key: string
          imported_count: number
          invalid_count: number
          request_hash: string
          results: Json
          skipped_count: number
          status: string
          total_count: number
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "import_batches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_member: { Args: { w: string }; Returns: boolean }
      is_owner: { Args: { w: string }; Returns: boolean }
      queue_website_audit: {
        Args: { capability_hash: string; p: string; target_url: string }
        Returns: string
      }
      save_discovery_prospects: {
        Args: { category?: string; ids: string[]; provider: string; w: string }
        Returns: Json
      }
      search_discovery_places: {
        Args: { category: string; location: string; page?: number }
        Returns: {
          address: string
          attributions: Json
          business_name: string
          categories: string[]
          city: string
          country: string
          id: string
          imported_at: string
          industry: string
          latitude: number
          longitude: number
          phone: string | null
          province: string
          release: string
          website_url: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "discovery_places"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      pipeline_stage:
        | "new"
        | "reviewed"
        | "contacted"
        | "meeting"
        | "proposal"
        | "won"
        | "lost"
      website_status:
        | "unknown"
        | "website_present"
        | "social_only"
        | "no_website_linked"
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
    Enums: {
      pipeline_stage: [
        "new",
        "reviewed",
        "contacted",
        "meeting",
        "proposal",
        "won",
        "lost",
      ],
      website_status: [
        "unknown",
        "website_present",
        "social_only",
        "no_website_linked",
      ],
    },
  },
} as const

