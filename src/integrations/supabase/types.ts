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
      categories: {
        Row: {
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      gig_likes: {
        Row: {
          created_at: string
          gig_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gig_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          gig_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gig_likes_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      gig_saves: {
        Row: {
          created_at: string
          gig_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gig_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          gig_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gig_saves_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      gigs: {
        Row: {
          attachments: Json
          category_id: string | null
          cover_url: string | null
          created_at: string
          delivery_days: number
          description: string
          freelancer_id: string
          id: string
          likes_count: number
          rating: number | null
          reviews_count: number | null
          saves_count: number
          starting_price: number
          status: Database["public"]["Enums"]["gig_status"]
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          delivery_days?: number
          description: string
          freelancer_id: string
          id?: string
          likes_count?: number
          rating?: number | null
          reviews_count?: number | null
          saves_count?: number
          starting_price: number
          status?: Database["public"]["Enums"]["gig_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          delivery_days?: number
          description?: string
          freelancer_id?: string
          id?: string
          likes_count?: number
          rating?: number | null
          reviews_count?: number | null
          saves_count?: number
          starting_price?: number
          status?: Database["public"]["Enums"]["gig_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gigs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gigs_freelancer_profile_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          currency: string
          due_date: string | null
          id: string
          items: Json
          notes: string | null
          number: string
          recipient_id: string
          sender_id: string
          status: string
          subtotal: number
          tax: number
          title: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          items?: Json
          notes?: string | null
          number?: string
          recipient_id: string
          sender_id: string
          status?: string
          subtotal?: number
          tax?: number
          title: string
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          items?: Json
          notes?: string | null
          number?: string
          recipient_id?: string
          sender_id?: string
          status?: string
          subtotal?: number
          tax?: number
          title?: string
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      job_likes: {
        Row: {
          created_at: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_likes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_saves: {
        Row: {
          created_at: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_saves_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          attachments: Json
          budget_max: number | null
          budget_min: number | null
          category_id: string | null
          client_id: string
          created_at: string
          description: string
          experience_level: string | null
          id: string
          is_hourly: boolean | null
          likes_count: number
          proposals_count: number | null
          saves_count: number
          skills: string[] | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          budget_max?: number | null
          budget_min?: number | null
          category_id?: string | null
          client_id: string
          created_at?: string
          description: string
          experience_level?: string | null
          id?: string
          is_hourly?: boolean | null
          likes_count?: number
          proposals_count?: number | null
          saves_count?: number
          skills?: string[] | null
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          budget_max?: number | null
          budget_min?: number | null
          category_id?: string | null
          client_id?: string
          created_at?: string
          description?: string
          experience_level?: string | null
          id?: string
          is_hourly?: boolean | null
          likes_count?: number
          proposals_count?: number | null
          saves_count?: number
          skills?: string[] | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_client_profile_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_size: number | null
          attachment_type: string | null
          attachment_url: string | null
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          reply_to: string | null
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          reply_to?: string | null
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          reply_to?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          gig_id: string | null
          id: string
          job_id: string | null
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          gig_id?: string | null
          id?: string
          job_id?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          gig_id?: string | null
          id?: string
          job_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          headline: string | null
          hourly_rate: number | null
          id: string
          location: string | null
          plan: string
          rating: number
          reviews_count: number
          skills: string[] | null
          theme: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          headline?: string | null
          hourly_rate?: number | null
          id: string
          location?: string | null
          plan?: string
          rating?: number
          reviews_count?: number
          skills?: string[] | null
          theme?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          headline?: string | null
          hourly_rate?: number | null
          id?: string
          location?: string | null
          plan?: string
          rating?: number
          reviews_count?: number
          skills?: string[] | null
          theme?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      proposals: {
        Row: {
          bid_amount: number
          cover_letter: string
          created_at: string
          delivery_days: number
          freelancer_id: string
          id: string
          job_id: string
          status: string
          updated_at: string
        }
        Insert: {
          bid_amount: number
          cover_letter: string
          created_at?: string
          delivery_days?: number
          freelancer_id: string
          id?: string
          job_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          bid_amount?: number
          cover_letter?: string
          created_at?: string
          delivery_days?: number
          freelancer_id?: string
          id?: string
          job_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_id: string
          comment: string | null
          created_at: string
          gig_id: string | null
          id: string
          job_id: string | null
          rating: number
          subject_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          comment?: string | null
          created_at?: string
          gig_id?: string | null
          id?: string
          job_id?: string | null
          rating: number
          subject_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          comment?: string | null
          created_at?: string
          gig_id?: string | null
          id?: string
          job_id?: string | null
          rating?: number
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
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
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          metadata: Json
          reference: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          reference?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          reference?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "freelancer" | "client" | "admin"
      gig_status: "active" | "paused" | "draft"
      job_status: "open" | "in_progress" | "closed"
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
      app_role: ["freelancer", "client", "admin"],
      gig_status: ["active", "paused", "draft"],
      job_status: ["open", "in_progress", "closed"],
    },
  },
} as const
