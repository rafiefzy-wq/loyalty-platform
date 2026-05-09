export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string
          owner_id: string
          name: string
          slug: string
          type: string
          logo_url: string | null
          brand_color: string
          secondary_color: string
          background_image_url: string | null
          font_choice: string
          plan: string
          is_multi_location: boolean
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['businesses']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['businesses']['Insert']>
      }
      locations: {
        Row: {
          id: string
          business_id: string
          name: string
          address: string | null
          city: string | null
          country: string | null
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['locations']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['locations']['Insert']>
      }
      loyalty_cards: {
        Row: {
          id: string
          business_id: string
          stamp_goal: number
          reward_description: string
          card_scope: string
          is_active: boolean
          strip_image_url: string | null
          icon_url: string | null
          background_color: string
          foreground_color: string
          label_color: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['loyalty_cards']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['loyalty_cards']['Insert']>
      }
      employees: {
        Row: {
          id: string
          business_id: string
          location_id: string | null
          user_id: string
          role: string
          email: string
          name: string | null
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['employees']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['employees']['Insert']>
      }
      customer_passes: {
        Row: {
          id: string
          loyalty_card_id: string
          location_id: string | null
          apple_pass_serial: string | null
          google_pass_id: string | null
          apple_push_token: string | null
          stamp_count: number
          pass_url: string | null
          customer_device: string | null
          created_at: string
          last_visited_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['customer_passes']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['customer_passes']['Insert']>
      }
      stamp_transactions: {
        Row: {
          id: string
          customer_pass_id: string
          location_id: string
          employee_id: string | null
          type: string
          note: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['stamp_transactions']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['stamp_transactions']['Insert']>
      }
      employee_invitations: {
        Row: {
          id: string
          business_id: string
          location_id: string | null
          email: string
          role: string
          token: string
          accepted_at: string | null
          expires_at: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['employee_invitations']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['employee_invitations']['Insert']>
      }
    }
    Views: {}
    Functions: {
      get_my_business_id: { Args: {}; Returns: string }
      is_business_owner: { Args: { bid: string }; Returns: boolean }
      is_business_employee: { Args: { bid: string }; Returns: boolean }
      can_access_business: { Args: { bid: string }; Returns: boolean }
    }
  }
}

// Convenience row types
export type Business = Database['public']['Tables']['businesses']['Row']
export type Location = Database['public']['Tables']['locations']['Row']
export type LoyaltyCard = Database['public']['Tables']['loyalty_cards']['Row']
export type Employee = Database['public']['Tables']['employees']['Row']
export type CustomerPass = Database['public']['Tables']['customer_passes']['Row']
export type StampTransaction = Database['public']['Tables']['stamp_transactions']['Row']
export type EmployeeInvitation = Database['public']['Tables']['employee_invitations']['Row']
