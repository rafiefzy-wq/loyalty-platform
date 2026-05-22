import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreditCard, Check, Sparkles, Users, Bell, MapPin, BarChart3, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PLAN_FEATURES = {
  free_trial: {
    name: 'Free Trial',
    price: '$0',
    period: '14 days',
    color: 'gray',
    features: [
      'Unlimited customers',
      '1 active loyalty program',
      'Apple + Google Wallet',
      'QR code generation',
      'Basic analytics',
    ],
  },
  pro: {
    name: 'Pro',
    price: '$29',
    period: 'per month',
    color: 'indigo',
    features: [
      'Everything in Free Trial',
      'Unlimited loyalty programs',
      'Push notification broadcasts',
      'Team members + roles',
      'Multi-location tracking',
      '30-day analytics',
      'Email notifications',
      'Priority support',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    color: 'gray',
    features: [
      'Everything in Pro',
      'Custom branding',
      'API access',
      'SSO + advanced security',
      'Dedicated account manager',
      'SLA + custom contracts',
    ],
  },
}

export default async function BillingPage() {
  const token = await convexAuthNextjsToken()
  if (!token) redirect('/login')

  const business = await fetchQuery(api.businesses.getMyBusiness, {}, { token })
  if (!business) redirect('/onboarding')

  const currentPlan = business.plan
  const planInfo = PLAN_FEATURES[currentPlan as keyof typeof PLAN_FEATURES] ?? PLAN_FEATURES.free_trial
  const stripeEnabled = !!process.env.STRIPE_SECRET_KEY

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Billing & Plans</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage your subscription and unlock more features.</p>
      </div>

      {/* Current plan */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <CardTitle className="text-base">Current plan</CardTitle>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{planInfo.name} • {planInfo.price} {planInfo.period}</p>
            </div>
          </div>
          {currentPlan === 'free_trial' && (
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
              Trial
            </span>
          )}
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 mb-5">
            {planInfo.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Plan comparison */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Upgrade your plan</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {(['free_trial', 'pro', 'enterprise'] as const).map((key) => {
            const plan = PLAN_FEATURES[key]
            const isCurrent = key === currentPlan
            const isPro = key === 'pro'
            return (
              <Card
                key={key}
                className={`border-0 shadow-sm ${isPro ? 'ring-2 ring-indigo-500 dark:ring-indigo-400' : ''}`}
              >
                <div className="p-5 space-y-4">
                  {isPro && (
                    <div className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                      <Sparkles className="w-3 h-3" />
                      Most popular
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-lg text-gray-900 dark:text-gray-100">{plan.name}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {plan.price}
                      {plan.period && <span className="text-sm font-normal text-gray-500 dark:text-gray-400"> / {plan.period}</span>}
                    </p>
                  </div>
                  <ul className="space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <Button variant="outline" disabled className="w-full">Current plan</Button>
                  ) : key === 'enterprise' ? (
                    <Button variant="outline" asChild className="w-full">
                      <a href="mailto:sales@stamppass.app">Contact sales</a>
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      disabled={!stripeEnabled}
                      className="w-full gap-1.5"
                      title={!stripeEnabled ? 'Billing is being configured' : undefined}
                    >
                      {stripeEnabled ? 'Upgrade now' : 'Coming soon'}
                      {stripeEnabled && <ArrowRight className="w-3.5 h-3.5" />}
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Stripe setup notice for unconfigured deployments */}
      {!stripeEnabled && (
        <Card className="border-0 shadow-sm bg-amber-50 dark:bg-amber-900/10 border-l-4 border-l-amber-400">
          <div className="p-4 text-sm text-amber-900 dark:text-amber-200">
            <p className="font-semibold mb-1">Billing not yet configured</p>
            <p className="text-amber-800 dark:text-amber-300/80 text-xs">
              To enable Pro upgrades, set <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded">STRIPE_SECRET_KEY</code> and <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded">STRIPE_WEBHOOK_SECRET</code> in your Vercel environment variables and Stripe price IDs in Convex env.
            </p>
          </div>
        </Card>
      )}

      {/* Why upgrade */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">What you unlock with Pro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: Sparkles, title: 'Unlimited programs', desc: 'Run multiple loyalty programs in parallel (coffee, pastry, etc.)' },
              { icon: Bell, title: 'Push broadcasts', desc: 'Send promo notifications straight to customer wallets' },
              { icon: Users, title: 'Team + roles', desc: 'Invite staff and managers with granular permissions' },
              { icon: MapPin, title: 'Multi-location', desc: 'Track stamps across all your branches with alerts' },
              { icon: BarChart3, title: '30-day analytics', desc: 'See daily trends, top customers, device breakdowns' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
