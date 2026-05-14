import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/dashboard/dashboard-nav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const token = await convexAuthNextjsToken()
  if (!token) redirect('/login')

  const business = await fetchQuery(api.businesses.getMyBusiness, {}, { token })
  if (!business) redirect('/onboarding')

  const navBusiness = {
    id: business._id,
    name: business.name,
    slug: business.slug,
    type: business.type,
    logo_url: business.logoUrl ?? null,
    brand_color: business.brandColor,
    secondary_color: business.secondaryColor,
    background_image_url: business.backgroundImageUrl ?? null,
    font_choice: business.fontChoice,
    plan: business.plan,
    is_multi_location: business.isMultiLocation,
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardNav business={navBusiness as any} />
      <main className="flex-1 min-w-0 lg:ml-64">
        <div className="px-6 py-8 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
