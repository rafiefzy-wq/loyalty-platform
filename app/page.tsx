import Link from 'next/link'
import { AppleWalletPreview } from '@/components/wallet-preview/wallet-card-preview'
import {
  Palette,
  Zap,
  BarChart3,
  Bell,
  Users,
  MapPin,
  QrCode,
  CheckCircle2,
  ArrowRight,
  Star,
} from 'lucide-react'

const DEMO_CARD = {
  businessName: 'The Daily Grind',
  logoUrl: null,
  stripImageUrl: null,
  backgroundColor: '#1a1a2e',
  foregroundColor: '#ffffff',
  labelColor: '#818cf8',
  stampCount: 6,
  stampGoal: 10,
  rewardDescription: '1 free coffee',
  fontChoice: 'inter',
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-gray-100 sticky top-0 z-40 bg-white/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <span className="text-2xl">🎫</span> StampPass
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">
              Sign in
            </Link>
            <Link
              href="/onboarding"
              className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-sm font-medium px-3 py-1.5 rounded-full mb-6">
            <Zap className="w-3.5 h-3.5" /> Live in under 2 minutes
          </div>
          <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6 text-center">
            Loyalty cards your customers{' '}
            <span className="text-indigo-600">actually keep</span>
          </h1>
          <p className="text-xl font-semibold text-gray-500 leading-relaxed mb-8 text-center">
            Create digital stamp cards that live natively inside Apple Wallet and Google Wallet. No app download. No account creation. Just scan and collect.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-left">
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white text-base font-semibold px-8 py-4 rounded-2xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              Start free — 2 min setup <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 text-base font-semibold px-8 py-4 rounded-2xl hover:bg-gray-200 transition-colors"
            >
              See how it works
            </a>
          </div>
          <div className="flex items-center gap-4 mt-6 text-sm text-gray-500">
            <div className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> No credit card</div>
            <div className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> No app needed</div>
            <div className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> Free trial</div>
          </div>
        </div>

        {/* Live card preview */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl -rotate-3 scale-105" />
          <div className="relative bg-white rounded-3xl p-6 shadow-2xl">
            <div className="text-xs text-gray-400 uppercase tracking-widest mb-3 font-medium">Apple Wallet — Live preview</div>
            <AppleWalletPreview data={DEMO_CARD} />
            <div className="mt-4 text-xs text-gray-400 uppercase tracking-widest mb-3 font-medium">Google Wallet</div>
            <div className="rounded-2xl overflow-hidden" style={{ background: DEMO_CARD.backgroundColor }}>
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-indigo-300 uppercase tracking-widest">Loyalty Card</p>
                    <p className="text-white font-bold text-lg">{DEMO_CARD.businessName}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl w-10 h-10 flex items-center justify-center text-xl">☕</div>
                </div>
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full border-2"
                      style={{
                        backgroundColor: i < 6 ? 'white' : 'transparent',
                        borderColor: 'white',
                        opacity: i < 6 ? 1 : 0.35,
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-white">
                  <div><p className="text-xs text-indigo-300">Reward</p><p className="text-sm font-semibold">1 free coffee</p></div>
                  <div className="text-right"><p className="text-xs text-indigo-300">Stamps</p><p className="text-2xl font-bold">6<span className="text-sm opacity-60"> / 10</span></p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="bg-gray-50 border-y border-gray-100 py-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm text-gray-400 uppercase tracking-widest mb-6">Loved by local businesses</p>
          <div className="flex flex-wrap justify-center gap-6">
            {['Cafes', 'Bakeries', 'Salons', 'Restaurants', 'Yoga Studios', 'Barbers'].map((type) => (
              <span key={type} className="px-4 py-2 bg-white rounded-full border border-gray-200 text-sm text-gray-600 font-medium">
                {type}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Dead simple for everyone</h2>
          <p className="text-lg text-gray-500">Three steps for your customers. Two minutes for you.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: '1', icon: QrCode, title: 'QR at your counter', desc: "Print the QR code StampPass generates and put it at your till or in your window.", color: 'bg-blue-50 text-blue-600' },
            { step: '2', icon: Zap, title: 'Customer scans once', desc: "They scan with their phone camera — no app needed. One tap to add to Apple or Google Wallet.", color: 'bg-purple-50 text-purple-600' },
            { step: '3', icon: Star, title: 'Stamps update in Wallet', desc: "Every visit, your staff scan the customer's card. Their stamp count updates in real time.", color: 'bg-indigo-50 text-indigo-600' },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className={`w-16 h-16 rounded-2xl ${item.color} flex items-center justify-center mx-auto mb-5`}>
                <item.icon className="w-7 h-7" />
              </div>
              <div className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-2">Step {item.step}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
              <p className="text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-50 border-y border-gray-100 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything you need. Nothing you don't.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Palette, title: 'Full design control', desc: 'Pick colors, fonts, upload your logo and strip image. Live preview shows exactly what customers will see in Wallet.' },
              { icon: Zap, title: '2-minute setup', desc: "Answer 4 questions in our guided wizard and you'll have a live QR code ready to display at your counter." },
              { icon: BarChart3, title: 'Real analytics', desc: 'See daily stamp activity, top customers, reward redemption rates, and device breakdown.' },
              { icon: Bell, title: 'Push notifications', desc: "Send promo broadcasts that appear on your customers' lock screen — no app required." },
              { icon: Users, title: 'Team access', desc: 'Invite staff to stamp from their personal phones. Set roles (staff, manager, owner) with granular permissions.' },
              { icon: MapPin, title: 'Multi-location', desc: 'Run multiple branches? Stamps can count globally or per-location depending on your programme.' },
            ].map((feature) => (
              <div key={feature.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">vs. the alternatives</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-3 pr-8 text-gray-500 font-medium">Feature</th>
                <th className="py-3 px-6 text-indigo-600 font-bold bg-indigo-50 rounded-t-xl">StampPass</th>
                <th className="py-3 px-6 text-gray-400 font-medium">Paper cards</th>
                <th className="py-3 px-6 text-gray-400 font-medium">Loyalty apps</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ['No app required', true, true, false],
                ['Lives in Apple/Google Wallet', true, false, false],
                ['Real-time updates', true, false, true],
                ['Push notifications', true, false, true],
                ['Card design customisation', true, 'basic', true],
                ['Analytics dashboard', true, false, true],
                ['Multi-location support', true, false, true],
                ['Team scanner interface', true, false, true],
                ['2-minute setup', true, false, false],
                ['No customer app needed', true, true, false],
              ].map(([feature, stamppass, paper, apps]) => (
                <tr key={feature as string}>
                  <td className="py-3 pr-8 text-gray-700">{feature as string}</td>
                  <td className="py-3 px-6 text-center bg-indigo-50/40">{stamppass === true ? '✅' : stamppass === false ? '❌' : stamppass}</td>
                  <td className="py-3 px-6 text-center text-gray-400">{paper === true ? '✅' : paper === false ? '❌' : paper}</td>
                  <td className="py-3 px-6 text-center text-gray-400">{apps === true ? '✅' : apps === false ? '❌' : apps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-gray-50 border-y border-gray-100 py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple pricing</h2>
            <p className="text-lg text-gray-500">Start free. Upgrade as you grow.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Starter', price: 'Free', period: '', desc: 'Perfect for trying it out', features: ['1 loyalty card', 'Up to 100 customers', 'Basic analytics', 'Email support'], cta: 'Start free', highlight: false },
              { name: 'Growth', price: '£19', period: '/mo', desc: 'For growing businesses', features: ['Unlimited customers', 'Push notifications', 'Team access (5 staff)', 'Multi-location (3)', 'Advanced analytics'], cta: 'Coming soon', highlight: true },
              { name: 'Pro', price: '£49', period: '/mo', desc: 'For established chains', features: ['Everything in Growth', 'Unlimited locations', 'Unlimited team members', 'Priority support', 'Custom branding'], cta: 'Coming soon', highlight: false },
            ].map((plan) => (
              <div key={plan.name} className={`rounded-2xl p-7 border ${plan.highlight ? 'border-indigo-400 bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'border-gray-200 bg-white'}`}>
                <p className={`font-bold text-sm uppercase tracking-widest mb-1 ${plan.highlight ? 'text-indigo-200' : 'text-gray-400'}`}>{plan.name}</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  <span className={plan.highlight ? 'text-indigo-200' : 'text-gray-500'}>{plan.period}</span>
                </div>
                <p className={`text-sm mb-6 ${plan.highlight ? 'text-indigo-200' : 'text-gray-500'}`}>{plan.desc}</p>
                <ul className="space-y-2 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${plan.highlight ? 'text-indigo-100' : 'text-gray-600'}`}>
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? 'text-indigo-300' : 'text-green-500'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/onboarding"
                  className={`block text-center py-3 rounded-xl font-semibold text-sm transition-colors ${
                    plan.highlight ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                    : plan.cta === 'Coming soon' ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">FAQ</h2>
        </div>
        <div className="space-y-6">
          {[
            { q: 'Do customers need to download an app?', a: 'No. Customers scan the QR code with their phone camera — iOS or Android — and the card is saved directly to Apple Wallet or Google Wallet with one tap.' },
            { q: 'How do employees add stamps?', a: "Employees log in to a mobile-optimised web page from their phone browser, tap \"Scan Customer Card\", point at the QR code on the customer's Wallet card, and the stamp is added instantly." },
            { q: 'What Apple Developer certificates do I need?', a: 'You need a Pass Type ID certificate from the Apple Developer Portal, plus an APN key for push notifications. We provide setup documentation with every account.' },
            { q: 'Can I customise the card design?', a: 'Yes — full control. Choose background colour, text colour, font, upload your logo, and optionally a strip/hero image. The live preview updates as you type.' },
            { q: 'Do pass updates happen in real time?', a: "Yes. When a stamp is added, the card updates in the customer's Wallet automatically via push notifications (Apple) and the Wallet API (Google)." },
            { q: 'What if I have multiple locations?', a: 'You can run stamps globally (count everywhere) or per-location. Employees are assigned to specific locations and can only stamp from their assigned location.' },
          ].map((item) => (
            <div key={item.q} className="border-b border-gray-100 pb-6">
              <h3 className="font-semibold text-gray-900 mb-2">{item.q}</h3>
              <p className="text-gray-500 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-indigo-600 py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready in 2 minutes</h2>
          <p className="text-indigo-200 text-lg mb-8">
            Set up your loyalty card, get a QR code, and start rewarding customers today. No credit card required.
          </p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 bg-white text-indigo-600 font-bold px-10 py-4 rounded-2xl text-lg hover:bg-indigo-50 transition-colors shadow-xl"
          >
            Start free — set up in 2 minutes <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-gray-900 font-bold">
            <span className="text-xl">🎫</span> StampPass
          </Link>
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} StampPass. All rights reserved.</p>
          <div className="flex gap-4 text-sm text-gray-400">
            <a href="#" className="hover:text-gray-600">Privacy</a>
            <a href="#" className="hover:text-gray-600">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
