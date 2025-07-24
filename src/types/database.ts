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
  first_name?: string;
  last_name?: string;
  shekel_balance?: number;
  
  // Authentication fields (to be added)
  jaas_password?: string;
  role?: 'user' | 'moderator' | 'admin';
  status?: 'active' | 'inactive' | 'suspended';
  last_login?: string;
  avatar_url?: string;
  bio?: string;
  preferences?: Record<string, any>;
}

export interface Database {
  public: {
    Tables: {
      verified_profiles: {
        Row: VerifiedProfile;
        Insert: Omit<VerifiedProfile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<VerifiedProfile, 'id' | 'created_at' | 'updated_at'>>;
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