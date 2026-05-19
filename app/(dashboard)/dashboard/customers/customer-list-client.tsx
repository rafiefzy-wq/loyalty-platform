'use client'

import { useState } from 'react'
import type { CustomerPass, LoyaltyCard, Location } from '@/lib/types'
import { toast } from '@/lib/hooks/use-toast'
import { Search, Gift, Apple, Smartphone, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  passes: CustomerPass[]
  loyaltyCard: LoyaltyCard | null
  locations: Location[]
}

export function CustomerListClient({ passes, loyaltyCard, locations }: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'reward_ready'>('all')
  const [redeemingId, setRedeemingId] = useState<string | null>(null)

  const filtered = passes.filter((p) => {
    const s = search.toLowerCase()
    const matchSearch =
      !s ||
      p.id.toLowerCase().includes(s) ||
      (p.customer_name && p.customer_name.toLowerCase().includes(s))
    const matchFilter = filter === 'all' || (filter === 'reward_ready' && p.stamp_count >= (loyaltyCard?.stamp_goal || 999))
    return matchSearch && matchFilter
  })

  async function handleRedeem(passId: string) {
    if (!locations[0]) {
      toast({ title: 'No location configured', variant: 'destructive' })
      return
    }
    setRedeemingId(passId)
    const res = await fetch('/api/stamps/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passId, locationId: locations[0].id }),
    })
    if (res.ok) {
      toast({ title: 'Reward redeemed!', variant: 'success' })
      // Refresh the page data
      window.location.reload()
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Failed' }))
      toast({ title: error, variant: 'destructive' })
    }
    setRedeemingId(null)
  }

  const rewardReadyCount = passes.filter((p) => p.stamp_count >= (loyaltyCard?.stamp_goal || 999)).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm mt-1">{passes.length} total passes issued</p>
        </div>
        {rewardReadyCount > 0 && (
          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2">
            <span className="text-yellow-600 text-sm font-semibold">🎉 {rewardReadyCount} reward{rewardReadyCount > 1 ? 's' : ''} ready</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name or pass ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('reward_ready')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === 'reward_ready' ? 'bg-yellow-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            Reward ready
          </button>
        </div>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Name</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Pass ID</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Device</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Stamps</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Last Visit</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                    No customers found
                  </td>
                </tr>
              ) : (
                filtered.map((pass) => {
                  const isReady = pass.stamp_count >= (loyaltyCard?.stamp_goal || 999)
                  return (
                    <tr key={pass.id} className={`hover:bg-gray-50 transition-colors ${isReady ? 'bg-yellow-50/50' : ''}`}>
                      <td className="px-5 py-4">
                        {pass.customer_name ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">
                              {pass.customer_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-gray-900">{pass.customer_name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400">
                            <User className="w-4 h-4" />
                            <span className="text-sm italic">Anonymous</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-sm text-gray-700">{pass.id.slice(0, 12)}…</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          {pass.customer_device === 'apple' ? (
                            <Apple className="w-4 h-4 text-gray-600" />
                          ) : (
                            <Smartphone className="w-4 h-4 text-gray-600" />
                          )}
                          <span className="text-sm text-gray-600 capitalize">{pass.customer_device || '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full transition-all"
                              style={{
                                width: `${Math.min((pass.stamp_count / (loyaltyCard?.stamp_goal || 1)) * 100, 100)}%`,
                                backgroundColor: isReady ? '#f59e0b' : '#6366f1',
                              }}
                            />
                          </div>
                          <span className="text-sm font-semibold tabular-nums text-gray-900">
                            {pass.stamp_count}/{loyaltyCard?.stamp_goal}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500">
                        {pass.last_visited_at
                          ? new Date(pass.last_visited_at).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-5 py-4">
                        {isReady ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-100 px-2.5 py-1 rounded-full">
                            🎉 Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {isReady && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleRedeem(pass.id)}
                            disabled={redeemingId === pass.id}
                            className="gap-1.5"
                          >
                            <Gift className="w-3.5 h-3.5" />
                            {redeemingId === pass.id ? 'Redeeming…' : 'Confirm'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
