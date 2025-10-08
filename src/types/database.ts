// Database types for Supabase tables

export interface VerifiedProfile {
  id: string;
  email: string;
  user_id?: string;
  stripe_account_id?: string;
  stripe_customer_id?: string;
  created_at?: string;
  streaming_minutes?: number;
  denomination_tags?: string[];
  website_url?: string;
  years_of_ministry?: number;
  education?: string;
  certifications?: string;
  languages_spoken?: string[];
  facebook_url?: string;
  twitter_url?: string;
  youtube_url?: string;
  instagram_url?: string;
  ministry_name?: string;
  subscription_status?: string;
  subscription_end_date?: string;
  subscription_expires_at?: string;
  subscription_plan?: string;
  subscription_plan_id?: string;
  first_name?: string;
  last_name?: string;
  shekel_balance?: number;
  
  // Authentication fields (to be added)
  jaas_password?: string;
  last_login?: string;
  avatar_url?: string;
  bio?: string;
  preferences?: Record<string, any>;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  streaming_minutes_limit: number;
  price_usd: number;
  features: string[];
  created_at?: string;
  updated_at?: string;
}

export interface WeeklyUsage {
  id: string;
  user_id: string;
  week_start_date: string;
  streamed_minutes: number;
  created_at?: string;
  updated_at?: string;
}

export interface Livestream {
  id: string;
  streamer_id: string;
  title: string;
  description?: string;
  is_live: boolean;
  started_at?: string;
  ended_at?: string;
  status?: 'active' | 'ended';
  scheduled_at?: string;
  updated_at: string;
  flag_count: number;
  is_hidden: boolean;
  stream_mode: string;
  tags: string[];
  viewer_count: number;
  max_viewers: number;
  jitsi_room_config?: any;
  room_name?: string;
  redirect_url?: string;
}

export interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  text: string;
  is_moderator: boolean;
  created_at?: string;
}

export interface Database {
  public: {
    Tables: {
      verified_profiles: {
        Row: VerifiedProfile;
        Insert: Omit<VerifiedProfile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<VerifiedProfile, 'id' | 'created_at' | 'updated_at'>>;
      };
      subscription_plans: {
        Row: SubscriptionPlan;
        Insert: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>>;
      };
      livestream_weekly_usage: {
        Row: WeeklyUsage;
        Insert: Omit<WeeklyUsage, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<WeeklyUsage, 'id' | 'created_at' | 'updated_at'>>;
      };
      livestreams: {
        Row: Livestream;
        Insert: Omit<Livestream, 'id' | 'updated_at'>;
        Update: Partial<Omit<Livestream, 'id' | 'updated_at'>>;
      };
      user_follows: {
        Row: UserFollow;
        Insert: Omit<UserFollow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserFollow, 'id' | 'created_at' | 'updated_at'>>;
      };
      livestream_chat: {
        Row: ChatMessage;
        Insert: Omit<ChatMessage, 'id' | 'created_at'>;
        Update: Partial<Omit<ChatMessage, 'id' | 'created_at'>>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
} 