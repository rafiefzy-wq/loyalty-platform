// Shared client-side row types — snake_case shape used by client components.
// The Convex schema uses camelCase; server pages map between the two when
// passing data into these components.

export interface Business {
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
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
}

export interface Location {
  id: string
  business_id: string
  name: string
  address: string | null
  city: string | null
  country: string | null
  is_active: boolean
}

export interface LoyaltyCard {
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
}

export interface Employee {
  id: string
  business_id: string
  location_id: string | null
  user_id: string
  role: string
  email: string
  name: string | null
  is_active: boolean
}

export interface CustomerPass {
  id: string
  loyalty_card_id: string
  location_id: string | null
  apple_pass_serial: string | null
  google_pass_id: string | null
  apple_push_token: string | null
  stamp_count: number
  pass_url: string | null
  customer_device: string | null
  customer_name: string | null
  last_visited_at: string | null
}

export interface EmployeeInvitation {
  id: string
  business_id: string
  location_id: string | null
  email: string
  role: string
  token: string
  accepted_at: string | null
  expires_at: string
  created_at?: string
}
