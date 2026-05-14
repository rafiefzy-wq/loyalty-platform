import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsClient } from './settings-client'
import { IS_DEV, DEV_BUSINESS } from '@/lib/dev-data'

export default async function SettingsPage() {
  if (IS_DEV) {
    return <SettingsClient business={DEV_BUSINESS as any} locations={[]} />
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!business) redirect('/onboarding')

  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at')

  return <SettingsClient business={business} locations={locations || []} />
}
