'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthActions } from '@convex-dev/auth/react'
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Palette,
  UserPlus,
  Bell,
  Settings,
  QrCode,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'
import { useMyRole } from '@/lib/hooks/use-role'
import { Sparkles, CreditCard } from 'lucide-react'

interface Business {
  name: string
  logo_url?: string | null
  brand_color: string
  plan: string
}

type Role = 'owner' | 'manager' | 'staff'

// Each nav item declares which roles can see it.
// 'owner' is the most privileged; managers can see most things except billing.
const navItems: Array<{
  href: string
  label: string
  icon: typeof LayoutDashboard
  exact?: boolean
  minRole: Role
}> = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true, minRole: 'staff' },
  { href: '/dashboard/customers', label: 'Customers', icon: Users, minRole: 'staff' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, minRole: 'manager' },
  { href: '/dashboard/programs', label: 'Programs', icon: Sparkles, minRole: 'owner' },
  { href: '/dashboard/design', label: 'Card Design', icon: Palette, minRole: 'owner' },
  { href: '/dashboard/team', label: 'Team', icon: UserPlus, minRole: 'owner' },
  { href: '/dashboard/broadcast', label: 'Broadcast', icon: Bell, minRole: 'manager' },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard, minRole: 'owner' },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, minRole: 'owner' },
]

const ROLE_RANK: Record<Role, number> = { staff: 0, manager: 1, owner: 2 }

export function DashboardNav({ business }: { business: Business }) {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuthActions()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { role } = useMyRole()

  // Until role resolves, default to staff visibility (least items shown).
  // After it loads, show everything the role permits.
  const userRank = role ? ROLE_RANK[role] : ROLE_RANK.staff
  const visibleNav = navItems.filter((item) => userRank >= ROLE_RANK[item.minRole])

  async function handleLogout() {
    await signOut()
    router.push('/')
    router.refresh()
  }

  function isActive(item: (typeof navItems)[0]) {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100">
            <span className="text-2xl">🎫</span> StampPass
          </Link>
          <ThemeToggle />
        </div>
        {business.logo_url ? (
          <img src={business.logo_url} alt={business.name} className="w-8 h-8 rounded-lg object-contain mt-3" />
        ) : (
          <div
            className="w-8 h-8 rounded-lg mt-3 flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: business.brand_color }}
          >
            {business.name[0]?.toUpperCase()}
          </div>
        )}
        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm mt-1 leading-tight">{business.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{business.plan.replace('_', ' ')}</p>
          {role && (
            <span className={cn(
              'text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded',
              role === 'owner' && 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
              role === 'manager' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
              role === 'staff' && 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
            )}>
              {role}
            </span>
          )}
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              isActive(item)
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
            )}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Scanner link */}
      <div className="px-3 pb-3">
        <Link
          href="/scanner"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition-colors"
        >
          <QrCode className="w-4 h-4" />
          Open Scanner
        </Link>
      </div>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 bg-white dark:bg-[#0f0f17] border-r border-gray-100 dark:border-gray-800 transition-colors">
        <NavContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-[#0f0f17] border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100">
          <span className="text-xl">🎫</span> {business.name}
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="lg:hidden fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-[#0f0f17]">
            <div className="pt-16">
              <NavContent />
            </div>
          </aside>
        </>
      )}

      {/* Mobile content padding */}
      <div className="lg:hidden h-14" />
    </>
  )
}
