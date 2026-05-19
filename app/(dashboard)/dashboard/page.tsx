import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Users, TrendingUp, Gift, QrCode, ArrowRight, Smartphone, Watch } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QuickEditRewardButton } from './quick-edit-reward'
import QRCode from 'qrcode'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const token = await convexAuthNextjsToken()
  if (!token) redirect('/login')

  const business = await fetchQuery(api.businesses.getMyBusiness, {}, { token })
  if (!business) redirect('/onboarding')

  const [stats, activeCard, recentPasses] = await Promise.all([
    fetchQuery(api.businesses.getStats, {}, { token }),
    fetchQuery(api.passes.getActiveCardForBusiness, {}, { token }),
    fetchQuery(api.passes.getRecentPasses, { limit: 8 }, { token }),
  ])

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://loyalty-platform-pearl.vercel.app'
  let qrDataUrl = ''
  if (activeCard) {
    const passUrl = `${appUrl}/pass/new?card=${activeCard._id}`
    qrDataUrl = await QRCode.toDataURL(passUrl, { width: 200, margin: 1, color: { dark: '#1e1b4b', light: '#ffffff' } })
  }

  const statCards = [
    { label: 'Total customers', value: stats?.customers ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Visits (stamps)', value: stats?.visits ?? 0, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Rewards claimed', value: stats?.rewards ?? 0, icon: Gift, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Active passes', value: stats?.passes ?? 0, icon: QrCode, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ]

  function deviceIcon(device: string) {
    if (device === 'apple') return <Watch className="w-4 h-4 text-gray-500" />
    if (device === 'google') return <Smartphone className="w-4 h-4 text-gray-500" />
    return <Smartphone className="w-4 h-4 text-gray-400" />
  }

  function timeAgo(ms: number) {
    const diff = Date.now() - ms
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (mins > 0) return `${mins}m ago`
    return 'just now'
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back to {business.name}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
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
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Counter QR Code</CardTitle>
            {activeCard && (
              <QuickEditRewardButton
                initialStampGoal={activeCard.stampGoal}
                initialReward={activeCard.rewardDescription}
              />
            )}
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            {qrDataUrl ? (
              <>
                <Image src={qrDataUrl} alt="Loyalty card QR code" width={160} height={160} className="rounded-lg" />
                <p className="text-xs text-gray-400 text-center">Customers scan this to add your loyalty card</p>
                {activeCard && (
                  <>
                    <div className="text-center text-xs space-y-0.5">
                      <p className="text-gray-700"><span className="font-semibold">{activeCard.stampGoal}</span> stamps → <span className="font-semibold">{activeCard.rewardDescription}</span></p>
                    </div>
                    <Link
                      href={`${appUrl}/pass/new?card=${activeCard._id}`}
                      target="_blank"
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      Preview pass link ↗
                    </Link>
                  </>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400 py-8 text-center">No active loyalty card found</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Customers</CardTitle>
            <Link href="/dashboard/customers" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentPasses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">👥</p>
                <p className="text-sm text-gray-500">Share your QR code to get started!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentPasses.map((pass) => (
                  <Link
                    key={pass.id}
                    href="/dashboard/customers"
                    className="flex items-center justify-between py-2.5 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {pass.customerName ? (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 flex-shrink-0">
                          {pass.customerName.charAt(0).toUpperCase()}
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          {deviceIcon(pass.device)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {pass.customerName || (pass.device === 'apple' ? 'Apple Wallet' : pass.device === 'google' ? 'Google Wallet' : 'Anonymous pass')}
                        </p>
                        <p className="text-xs text-gray-400">{timeAgo(pass.joinedAt)}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-700 tabular-nums">{pass.stampCount} / {pass.stampGoal}</p>
                      <p className="text-xs text-gray-400">stamps</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
