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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      clips: {
        Row: {
          clip_url: string | null
          created_at: string
          description: string | null
          duration_seconds: number
          id: string
          start_time_seconds: number
          stream_id: string | null
          thumbnail_url: string | null
          title: string
          user_id: string
          views: number
        }
        Insert: {
          clip_url?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number
          id?: string
          start_time_seconds?: number
          stream_id?: string | null
          thumbnail_url?: string | null
          title: string
          user_id: string
          views?: number
        }
        Update: {
          clip_url?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number
          id?: string
          start_time_seconds?: number
          stream_id?: string | null
          thumbnail_url?: string | null
          title?: string
          user_id?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "clips_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      earnings: {
        Row: {
          amount: number
          created_at: string
          currency: string
          from_user_id: string | null
          from_username: string | null
          id: string
          message: string | null
          stream_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          from_user_id?: string | null
          from_username?: string | null
          id?: string
          message?: string | null
          stream_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          from_user_id?: string | null
          from_username?: string | null
          id?: string
          message?: string | null
          stream_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "earnings_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      followers: {
        Row: {
          created_at: string
          follower_id: string
          id: string
          streamer_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          id?: string
          streamer_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          id?: string
          streamer_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      stream_analytics: {
        Row: {
          chat_messages: number
          concurrent_viewers: number
          id: string
          new_followers: number
          recorded_at: string
          stream_id: string
          user_id: string
        }
        Insert: {
          chat_messages?: number
          concurrent_viewers?: number
          id?: string
          new_followers?: number
          recorded_at?: string
          stream_id: string
          user_id: string
        }
        Update: {
          chat_messages?: number
          concurrent_viewers?: number
          id?: string
          new_followers?: number
          recorded_at?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_analytics_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          stream_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          stream_key?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          stream_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      streamer_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          categories: string[] | null
          created_at: string
          display_name: string | null
          id: string
          is_verified: boolean
          schedule: Json | null
          social_discord: string | null
          social_instagram: string | null
          social_tiktok: string | null
          social_twitter: string | null
          social_youtube: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          categories?: string[] | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_verified?: boolean
          schedule?: Json | null
          social_discord?: string | null
          social_instagram?: string | null
          social_tiktok?: string | null
          social_twitter?: string | null
          social_youtube?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          categories?: string[] | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_verified?: boolean
          schedule?: Json | null
          social_discord?: string | null
          social_instagram?: string | null
          social_tiktok?: string | null
          social_twitter?: string | null
          social_youtube?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      streams: {
        Row: {
          category: string | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          is_live: boolean
          peak_viewers: number
          started_at: string
          stream_key_id: string | null
          thumbnail_url: string | null
          title: string
          total_views: number
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          is_live?: boolean
          peak_viewers?: number
          started_at?: string
          stream_key_id?: string | null
          thumbnail_url?: string | null
          title?: string
          total_views?: number
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          is_live?: boolean
          peak_viewers?: number
          started_at?: string
          stream_key_id?: string | null
          thumbnail_url?: string | null
          title?: string
          total_views?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streams_stream_key_id_fkey"
            columns: ["stream_key_id"]
            isOneToOne: false
            referencedRelation: "stream_keys"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
