import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TeamClient } from './team-client'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!business) redirect('/onboarding')

  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at')

  const { data: invitations } = await supabase
    .from('employee_invitations')
    .select('*')
    .eq('business_id', business.id)
    .is('accepted_at', null)
    .order('created_at', { ascending: false })

  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .eq('business_id', business.id)

  return (
    <TeamClient
      employees={employees || []}
      invitations={invitations || []}
      locations={locations || []}
      businessId={business.id}
    />
  )
}
