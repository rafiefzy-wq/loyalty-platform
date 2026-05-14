import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/dashboard/dashboard-nav'

const DEV_BUSINESS = {
  id: 'dev',
  name: 'My Business (dev)',
  slug: 'my-business',
  type: 'cafe',
  logo_url: null,
  brand_color: '#6366f1',
  secondary_color: '#ffffff',
  background_image_url: null,
  font_choice: 'inter',
  plan: 'free_trial',
  is_multi_location: false,
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <DashboardNav business={DEV_BUSINESS as any} />
        <main className="flex-1 min-w-0 lg:ml-64">
          <div className="px-6 py-8 max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    )
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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardNav business={business} />
      <main className="flex-1 min-w-0 lg:ml-64">
        <div className="px-6 py-8 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
