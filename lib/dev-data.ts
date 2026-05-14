export const IS_DEV = process.env.NODE_ENV === 'development'

export const DEV_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'dev@example.com',
  user_metadata: { name: 'Dev User' },
}

export const DEV_BUSINESS = {
  id: '00000000-0000-0000-0000-000000000002',
  owner_id: DEV_USER.id,
  name: 'The Daily Grind',
  slug: 'the-daily-grind',
  type: 'cafe',
  logo_url: null,
  brand_color: '#6366f1',
  secondary_color: '#ffffff',
  background_image_url: null,
  font_choice: 'inter',
  plan: 'free_trial',
  is_multi_location: false,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}
