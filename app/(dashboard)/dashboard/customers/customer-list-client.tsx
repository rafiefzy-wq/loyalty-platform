'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import type { CustomerPass, LoyaltyCard, Location } from '@/lib/types'
import { toast } from '@/lib/hooks/use-toast'
import { Search, Gift, Apple, Smartphone, User, UserPlus, X, Stamp, Clock, MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

interface Props {
  passes: CustomerPass[]
  loyaltyCard: LoyaltyCard | null
  locations: Location[]
}

export function CustomerListClient({ passes, loyaltyCard, locations }: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'reward_ready'>('all')
  const [redeemingId, setRedeemingId] = useState<string | null>(null)

  // Add customer modal
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const createNamedPass = useMutation(api.passes.createNamedPass)

  // Detail drawer
  const [detailPassId, setDetailPassId] = useState<string | null>(null)

  const filtered = passes.filter((p) => {
    const s = search.toLowerCase()
    const matchSearch =
      !s ||
      p.id.toLowerCase().includes(s) ||
      (p.customer_name && p.customer_name.toLowerCase().includes(s))
    const matchFilter = filter === 'all' || (filter === 'reward_ready' && p.stamp_count >= (loyaltyCard?.stamp_goal || 999))
    return matchSearch && matchFilter
  })

  async function handleRedeem(passId: string, e?: React.MouseEvent) {
    e?.stopPropagation()
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
      window.location.reload()
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Failed' }))
      toast({ title: error, variant: 'destructive' })
    }
    setRedeemingId(null)
  }

  async function handleAddCustomer() {
    const trimmed = newName.trim()
    if (!trimmed) {
      toast({ title: 'Enter a customer name', variant: 'destructive' })
      return
    }
    setAdding(true)
    try {
      await createNamedPass({ customerName: trimmed })
      toast({ title: `"${trimmed}" added to Customers`, variant: 'success' })
      setAddOpen(false)
      setNewName('')
      window.location.reload()
    } catch (err) {
      toast({ title: (err as Error).message || 'Could not add customer', variant: 'destructive' })
    } finally {
      setAdding(false)
    }
  }

  const rewardReadyCount = passes.filter((p) => p.stamp_count >= (loyaltyCard?.stamp_goal || 999)).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm mt-1">{passes.length} total passes issued</p>
        </div>
        <div className="flex items-center gap-3">
          {rewardReadyCount > 0 && (
            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2">
              <span className="text-yellow-600 text-sm font-semibold">🎉 {rewardReadyCount} reward{rewardReadyCount > 1 ? 's' : ''} ready</span>
            </div>
          )}
          <Button variant="primary" onClick={() => setAddOpen(true)} className="gap-1.5">
            <UserPlus className="w-4 h-4" />
            Add customer
          </Button>
        </div>
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
                    <tr
                      key={pass.id}
                      onClick={() => setDetailPassId(pass.id)}
                      className={`cursor-pointer hover:bg-gray-50 transition-colors ${isReady ? 'bg-yellow-50/50' : ''}`}
                    >
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
                            onClick={(e) => handleRedeem(pass.id, e)}
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

      {/* Add Customer Modal */}
      {addOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setAddOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setAddOpen(false)}
              aria-label="Close"
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="mb-5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-3">
                <UserPlus className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Add a customer</h2>
              <p className="text-sm text-gray-500 mt-0.5">Create a named loyalty pass for a customer.</p>
            </div>
            <div className="space-y-1.5 mb-5">
              <Label htmlFor="new-customer-name">Customer name</Label>
              <Input
                id="new-customer-name"
                placeholder="e.g. John Doe"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={60}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomer() }}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAddOpen(false)} className="flex-1">Cancel</Button>
              <Button variant="primary" onClick={handleAddCustomer} disabled={adding} className="flex-1">
                {adding ? 'Adding…' : 'Add customer'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Detail Drawer */}
      {detailPassId && (
        <CustomerDetailDrawer
          passId={detailPassId as Id<'customerPasses'>}
          onClose={() => setDetailPassId(null)}
          onRedeem={() => detailPassId && handleRedeem(detailPassId)}
          redeeming={redeemingId === detailPassId}
        />
      )}
    </div>
  )
}

function CustomerDetailDrawer({
  passId,
  onClose,
  onRedeem,
  redeeming,
}: {
  passId: Id<'customerPasses'>
  onClose: () => void
  onRedeem: () => void
  redeeming: boolean
}) {
  const data = useQuery(api.passes.getPassDetail, { passId })

  function timeAgo(ms: number) {
    const diff = Date.now() - ms
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (days > 7) return new Date(ms).toLocaleDateString()
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (mins > 0) return `${mins}m ago`
    return 'just now'
  }

  const stampCount = data?.pass.stampCount ?? 0
  const stampGoal = data?.card.stampGoal ?? 0
  const isReady = stampCount >= stampGoal && stampGoal > 0

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white w-full sm:w-[420px] h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 id="drawer-title" className="font-semibold text-gray-900">Customer detail</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!data ? (
          <div className="p-10 text-center text-sm text-gray-400">Loading…</div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Identity */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-700">
                {data.pass.customerName ? data.pass.customerName.charAt(0).toUpperCase() : '?'}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-gray-900 truncate">
                  {data.pass.customerName || <span className="italic text-gray-400">Anonymous</span>}
                </p>
                <p className="text-xs text-gray-500 font-mono truncate">{data.pass.id}</p>
              </div>
            </div>

            {/* Stamp progress */}
            <div className={`rounded-2xl p-4 border ${isReady ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">Progress</p>
                {isReady && <span className="text-xs font-semibold text-yellow-700">🎉 Reward ready</span>}
              </div>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">
                {stampCount}<span className="text-gray-400 text-lg"> / {stampGoal}</span>
              </p>
              <div className="mt-2 w-full bg-white rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min((stampCount / Math.max(stampGoal, 1)) * 100, 100)}%`,
                    backgroundColor: isReady ? '#f59e0b' : '#6366f1',
                  }}
                />
              </div>
              {isReady && (
                <Button variant="primary" onClick={onRedeem} disabled={redeeming} className="w-full mt-3 gap-1.5">
                  <Gift className="w-4 h-4" />
                  {redeeming ? 'Redeeming…' : `Redeem reward (${data.card.rewardDescription})`}
                </Button>
              )}
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Device</p>
                <div className="flex items-center gap-1.5">
                  {data.pass.device === 'apple' ? <Apple className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                  <span className="text-sm font-medium text-gray-800 capitalize">{data.pass.device || 'Unknown'}</span>
                </div>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Joined</p>
                <p className="text-sm font-medium text-gray-800">{timeAgo(data.pass.joinedAt)}</p>
              </div>
            </div>

            {/* Transaction history */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">History</h3>
                <span className="text-xs text-gray-400">{data.transactions.length} event{data.transactions.length === 1 ? '' : 's'}</span>
              </div>
              {data.transactions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6 bg-gray-50 rounded-xl">No activity yet</p>
              ) : (
                <ul className="space-y-2 max-h-80 overflow-y-auto">
                  {data.transactions.map((t) => (
                    <li key={t.id} className="flex items-start gap-3 p-3 rounded-xl bg-white border border-gray-100">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${t.type === 'reward_redeemed' ? 'bg-yellow-50 text-yellow-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        {t.type === 'reward_redeemed' ? <Gift className="w-4 h-4" /> : <Stamp className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {t.type === 'reward_redeemed' ? 'Reward redeemed' : 'Stamp added'}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(t.createdAt)}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {t.locationName}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
