import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CardDesignClient } from './card-design-client'

export default async function CardDesignPage() {
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

  return <CardDesignClient business={business} loyaltyCard={loyaltyCard} />
}
