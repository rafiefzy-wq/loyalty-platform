import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { redirect } from 'next/navigation'
import { AnalyticsClient } from './analytics-client'

export default async function AnalyticsPage() {
  const token = await convexAuthNextjsToken()
  if (!token) redirect('/login')

  const business = await fetchQuery(api.businesses.getMyBusiness, {}, { token })
  if (!business) redirect('/onboarding')

  const stats = await fetchQuery(api.businesses.getStats, {}, { token })

  const deviceCounts = { apple: stats?.apple ?? 0, google: stats?.google ?? 0, unknown: 0 }
  const chartData = [{ date: new Date().toISOString().slice(0, 10), stamps: stats?.visits ?? 0, redemptions: stats?.rewards ?? 0 }]

  return (
    <AnalyticsClient
      chartData={chartData}
      deviceCounts={deviceCounts}
      totalPasses={stats?.customers ?? 0}
      totalStamps={stats?.visits ?? 0}
      totalRedemptions={stats?.rewards ?? 0}
    />
  )
}
