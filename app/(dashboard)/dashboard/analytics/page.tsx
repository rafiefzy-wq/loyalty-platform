import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AnalyticsClient } from './analytics-client'

export default async function AnalyticsPage() {
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

  // Last 30 days of transactions
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: transactions } = await supabase
    .from('stamp_transactions')
    .select('created_at, type')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at')

  // Passes over time (by creation date, last 30 days)
  const { data: passes } = await supabase
    .from('customer_passes')
    .select('created_at, stamp_count, customer_device')
    .eq('loyalty_card_id', loyaltyCard?.id || '')
    .order('created_at')

  // Build daily chart data
  const dailyMap: Record<string, { stamps: number; redemptions: number }> = {}
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    dailyMap[key] = { stamps: 0, redemptions: 0 }
  }

  for (const tx of transactions || []) {
    const key = tx.created_at.slice(0, 10)
    if (dailyMap[key]) {
      if (tx.type === 'stamp') dailyMap[key].stamps++
      else if (tx.type === 'reward_redeemed') dailyMap[key].redemptions++
    }
  }

  const chartData = Object.entries(dailyMap).map(([date, vals]) => ({
    date: date.slice(5), // MM-DD
    stamps: vals.stamps,
    redemptions: vals.redemptions,
  }))

  // Device split
  const deviceCounts = { apple: 0, google: 0, unknown: 0 }
  for (const pass of passes || []) {
    const d = pass.customer_device as keyof typeof deviceCounts
    if (d in deviceCounts) deviceCounts[d]++
    else deviceCounts.unknown++
  }

  return (
    <AnalyticsClient
      chartData={chartData}
      deviceCounts={deviceCounts}
      totalPasses={passes?.length || 0}
      totalStamps={transactions?.filter((t) => t.type === 'stamp').length || 0}
      totalRedemptions={transactions?.filter((t) => t.type === 'reward_redeemed').length || 0}
    />
  )
}
