import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, TrendingUp, Gift, QrCode, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import QRCode from 'qrcode'

export default async function DashboardPage() {
  const token = await convexAuthNextjsToken()
  if (!token) redirect('/login')

  const business = await fetchQuery(api.businesses.getMyBusiness, {}, { token })
  if (!business) redirect('/onboarding')

  const stats = await fetchQuery(api.businesses.getStats, {}, { token })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const card = await fetchQuery(api.passes.getCardById, { cardId: undefined as any }, { token }).catch(() => null)

  // Get active loyalty card for QR
  let qrDataUrl = ''
  // We'll generate QR from the business pass URL pattern
  const passLinkUrl = `${appUrl}/pass/new?card=`
  // QR will be generated client-side or we skip for now

  const statCards = [
    { label: 'Total customers', value: stats?.customers ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Visits (stamps)', value: stats?.visits ?? 0, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Rewards claimed', value: stats?.rewards ?? 0, icon: Gift, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Active passes', value: stats?.passes ?? 0, icon: QrCode, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ]

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
          <CardHeader><CardTitle className="text-base">Counter QR Code</CardTitle></CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-400 py-8">Go to Customers to get your QR code</p>
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
            <div className="text-center py-8">
              <p className="text-3xl mb-2">👥</p>
              <p className="text-sm text-gray-500">Share your QR code to get started!</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
