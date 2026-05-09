import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, TrendingUp, Gift, QrCode, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import QRCode from 'qrcode'

export default async function DashboardPage() {
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

  // Stats
  const { count: totalPasses } = await supabase
    .from('customer_passes')
    .select('*', { count: 'exact', head: true })
    .eq('loyalty_card_id', loyaltyCard?.id || '')

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count: visitsThisWeek } = await supabase
    .from('stamp_transactions')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekAgo)
    .in(
      'customer_pass_id',
      (
        await supabase
          .from('customer_passes')
          .select('id')
          .eq('loyalty_card_id', loyaltyCard?.id || '')
      ).data?.map((p) => p.id) || []
    )

  const { count: rewardsClaimed } = await supabase
    .from('stamp_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'reward_redeemed')

  // Reward queue (passes at or over stamp goal)
  const { data: allPasses } = await supabase
    .from('customer_passes')
    .select('*')
    .eq('loyalty_card_id', loyaltyCard?.id || '')
    .gte('stamp_count', loyaltyCard?.stamp_goal || 999)
    .order('last_visited_at', { ascending: false })
    .limit(10)

  // Recent customers
  const { data: recentPasses } = await supabase
    .from('customer_passes')
    .select('*')
    .eq('loyalty_card_id', loyaltyCard?.id || '')
    .order('last_visited_at', { ascending: false })
    .limit(5)

  // QR code for counter display
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const passLinkUrl = loyaltyCard ? `${appUrl}/pass/new?card=${loyaltyCard.id}` : ''
  let qrDataUrl = ''
  if (passLinkUrl) {
    qrDataUrl = await QRCode.toDataURL(passLinkUrl, { width: 300, margin: 2 })
  }

  const stats = [
    { label: 'Total customers', value: totalPasses ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Visits this week', value: visitsThisWeek ?? 0, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Rewards claimed', value: rewardsClaimed ?? 0, icon: Gift, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Active passes', value: totalPasses ?? 0, icon: QrCode, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back to {business.name}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* QR Code card */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Counter QR Code</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            {qrDataUrl ? (
              <>
                <img src={qrDataUrl} alt="QR Code" className="w-40 h-40 mx-auto rounded-xl" />
                <p className="text-xs text-gray-500 mt-3 mb-4">Print and display at your counter</p>
                <a
                  href={qrDataUrl}
                  download="stamppass-qr.png"
                  className="inline-flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:underline"
                >
                  Download PNG
                </a>
              </>
            ) : (
              <p className="text-sm text-gray-400">No active loyalty card</p>
            )}
          </CardContent>
        </Card>

        {/* Reward queue */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Reward Queue</CardTitle>
            <Link href="/dashboard/customers" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {allPasses && allPasses.length > 0 ? (
              <div className="space-y-2">
                {allPasses.map((pass) => (
                  <div key={pass.id} className="flex items-center justify-between p-3 rounded-xl bg-yellow-50 border border-yellow-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Pass {pass.id.slice(0, 8)}…
                      </p>
                      <p className="text-xs text-gray-500">
                        {pass.stamp_count} / {loyaltyCard?.stamp_goal} stamps
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-200 px-2.5 py-1 rounded-full">
                      🎉 Ready
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">🎫</p>
                <p className="text-sm text-gray-500">No rewards ready yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent customers */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Customers</CardTitle>
          <Link href="/dashboard/customers" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {recentPasses && recentPasses.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {recentPasses.map((pass) => (
                <div key={pass.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-indigo-600">{pass.id.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Pass {pass.id.slice(0, 8)}…</p>
                      <p className="text-xs text-gray-400">
                        {pass.last_visited_at
                          ? new Date(pass.last_visited_at).toLocaleDateString()
                          : 'Never visited'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {pass.stamp_count} / {loyaltyCard?.stamp_goal}
                    </p>
                    <p className="text-xs text-gray-400">{pass.customer_device || 'Unknown'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">👥</p>
              <p className="text-sm text-gray-500">No customers yet. Share your QR code to get started!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
