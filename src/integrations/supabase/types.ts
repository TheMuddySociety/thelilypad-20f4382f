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
      allowlist_entries: {
        Row: {
          collection_id: string
          created_at: string
          created_by: string
          id: string
          max_mint: number | null
          notes: string | null
          phase_name: string
          wallet_address: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          created_by: string
          id?: string
          max_mint?: number | null
          notes?: string | null
          phase_name: string
          wallet_address: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          created_by?: string
          id?: string
          max_mint?: number | null
          notes?: string | null
          phase_name?: string
          wallet_address?: string
        }
        Relationships: []
      }
      blocked_patterns: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          pattern: string
          pattern_type: string
          reason: Database["public"]["Enums"]["moderation_reason"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          pattern: string
          pattern_type?: string
          reason?: Database["public"]["Enums"]["moderation_reason"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          pattern?: string
          pattern_type?: string
          reason?: Database["public"]["Enums"]["moderation_reason"]
        }
        Relationships: []
      }
      clip_comments: {
        Row: {
          clip_id: string
          content: string
          created_at: string
          id: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          clip_id: string
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          clip_id?: string
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clip_comments_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clip_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "clip_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      clip_events: {
        Row: {
          clip_id: string
          created_at: string
          event_type: string
          id: string
          platform: string | null
          viewer_id: string | null
        }
        Insert: {
          clip_id: string
          created_at?: string
          event_type: string
          id?: string
          platform?: string | null
          viewer_id?: string | null
        }
        Update: {
          clip_id?: string
          created_at?: string
          event_type?: string
          id?: string
          platform?: string | null
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clip_events_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
        ]
      }
      clip_reactions: {
        Row: {
          clip_id: string
          created_at: string
          emoji: string
          id: string
          user_id: string
        }
        Insert: {
          clip_id: string
          created_at?: string
          emoji: string
          id?: string
          user_id: string
        }
        Update: {
          clip_id?: string
          created_at?: string
          emoji?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clip_reactions_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
        ]
      }
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
      collections: {
        Row: {
          contract_address: string | null
          created_at: string
          creator_address: string
          creator_id: string
          description: string | null
          id: string
          image_url: string | null
          layers_metadata: Json | null
          minted: number
          name: string
          phases: Json
          royalty_percent: number
          status: string
          symbol: string
          total_supply: number
          trait_rules: Json | null
          updated_at: string
        }
        Insert: {
          contract_address?: string | null
          created_at?: string
          creator_address: string
          creator_id: string
          description?: string | null
          id?: string
          image_url?: string | null
          layers_metadata?: Json | null
          minted?: number
          name: string
          phases?: Json
          royalty_percent?: number
          status?: string
          symbol: string
          total_supply?: number
          trait_rules?: Json | null
          updated_at?: string
        }
        Update: {
          contract_address?: string | null
          created_at?: string
          creator_address?: string
          creator_id?: string
          description?: string | null
          id?: string
          image_url?: string | null
          layers_metadata?: Json | null
          minted?: number
          name?: string
          phases?: Json
          royalty_percent?: number
          status?: string
          symbol?: string
          total_supply?: number
          trait_rules?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      comment_reports: {
        Row: {
          comment_id: string
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "clip_comments"
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
      moderation_actions: {
        Row: {
          action_by: string | null
          action_type: string
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["moderation_status"] | null
          notes: string | null
          previous_status:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          queue_id: string | null
        }
        Insert: {
          action_by?: string | null
          action_type: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["moderation_status"] | null
          notes?: string | null
          previous_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          queue_id?: string | null
        }
        Update: {
          action_by?: string | null
          action_type?: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["moderation_status"] | null
          notes?: string | null
          previous_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          queue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "moderation_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_queue: {
        Row: {
          ai_details: Json | null
          ai_reasons: Database["public"]["Enums"]["moderation_reason"][] | null
          ai_score: number | null
          content_text: string | null
          content_type: Database["public"]["Enums"]["moderation_content_type"]
          content_url: string | null
          created_at: string
          id: string
          reference_id: string | null
          reference_table: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["moderation_status"]
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          ai_details?: Json | null
          ai_reasons?: Database["public"]["Enums"]["moderation_reason"][] | null
          ai_score?: number | null
          content_text?: string | null
          content_type: Database["public"]["Enums"]["moderation_content_type"]
          content_url?: string | null
          created_at?: string
          id?: string
          reference_id?: string | null
          reference_table?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["moderation_status"]
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          ai_details?: Json | null
          ai_reasons?: Database["public"]["Enums"]["moderation_reason"][] | null
          ai_score?: number | null
          content_text?: string | null
          content_type?: Database["public"]["Enums"]["moderation_content_type"]
          content_url?: string | null
          created_at?: string
          id?: string
          reference_id?: string | null
          reference_table?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["moderation_status"]
          submitted_by?: string | null
          updated_at?: string
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
      shop_item_contents: {
        Row: {
          created_at: string
          display_order: number
          file_url: string
          id: string
          item_id: string
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          file_url: string
          id?: string
          item_id: string
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          file_url?: string
          id?: string
          item_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_item_contents_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_items: {
        Row: {
          category: string
          created_at: string
          creator_id: string
          creator_type: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price_mon: number
          required_collection_id: string | null
          tier: string
          total_sales: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          creator_id: string
          creator_type?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price_mon?: number
          required_collection_id?: string | null
          tier?: string
          total_sales?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          creator_id?: string
          creator_type?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price_mon?: number
          required_collection_id?: string | null
          tier?: string
          total_sales?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_items_required_collection_id_fkey"
            columns: ["required_collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_purchases: {
        Row: {
          id: string
          item_id: string
          price_paid: number
          purchased_at: string
          tx_hash: string | null
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          price_paid: number
          purchased_at?: string
          tx_hash?: string | null
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          price_paid?: number
          purchased_at?: string
          tx_hash?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
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
      stream_chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          message_type: string
          playback_id: string
          sticker_item_id: string | null
          sticker_name: string | null
          sticker_url: string | null
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          message_type?: string
          playback_id: string
          sticker_item_id?: string | null
          sticker_name?: string | null
          sticker_url?: string | null
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          message_type?: string
          playback_id?: string
          sticker_item_id?: string | null
          sticker_name?: string | null
          sticker_url?: string | null
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_chat_messages_sticker_item_id_fkey"
            columns: ["sticker_item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
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
          banner_url: string | null
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
          banner_url?: string | null
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
          banner_url?: string | null
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
      moderation_content_type:
        | "text"
        | "image"
        | "collection_name"
        | "collection_description"
        | "trait_name"
        | "comment"
      moderation_reason:
        | "nsfw"
        | "violence"
        | "hate_speech"
        | "spam"
        | "harassment"
        | "illegal"
        | "other"
        | "clean"
      moderation_status:
        | "pending"
        | "approved"
        | "rejected"
        | "auto_rejected"
        | "auto_approved"
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
      moderation_content_type: [
        "text",
        "image",
        "collection_name",
        "collection_description",
        "trait_name",
        "comment",
      ],
      moderation_reason: [
        "nsfw",
        "violence",
        "hate_speech",
        "spam",
        "harassment",
        "illegal",
        "other",
        "clean",
      ],
      moderation_status: [
        "pending",
        "approved",
        "rejected",
        "auto_rejected",
        "auto_approved",
      ],
    },
  },
} as const
