import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CustomerListClient } from './customer-list-client'

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!business) redirect('/onboarding')

  const { data: loyaltyCard } = await supabase
    .from('loyalty_cards')
    .select('*')
    .eq('business_id', business.id)
    .eq('is_active', true)
    .single()

  const { data: passes } = await supabase
    .from('customer_passes')
    .select('*')
    .eq('loyalty_card_id', loyaltyCard?.id || '')
    .order('last_visited_at', { ascending: false })

  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .eq('business_id', business.id)

  return (
    <CustomerListClient
      passes={passes || []}
      loyaltyCard={loyaltyCard}
      locations={locations || []}
    />
  )
}
