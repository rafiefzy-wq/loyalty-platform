'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { toast } from '@/lib/hooks/use-toast'
import {
  Search, Gift, Apple, Smartphone, User, UserPlus, X, Stamp, Clock, MapPin,
  Pencil, Trash2, Download, Mail, Phone, Loader2, AlertTriangle,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

interface LocationOption {
  id: string
  name: string
}

interface Props {
  initialLocations: LocationOption[]
}

type LivePass = {
  id: string
  stampCount: number
  customerName: string | null
  customerEmail: string | null
  customerPhone: string | null
  avatarUrl: string | null
  device: string | null
  joinedAt: number
  lastVisitedAt: number | null
  locationId: string | null
}

export function CustomerListClient({ initialLocations }: Props) {
  // === Live realtime data ===
  const data = useQuery(api.passes.listMyCustomers)
  const passes: LivePass[] = data?.passes ?? []
  const stampGoal = data?.stampGoal ?? 0
  const rewardDescription = data?.rewardDescription ?? ''
  const isLoading = data === undefined

  // === UI state ===
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'reward_ready'>('all')
  const [redeemingId, setRedeemingId] = useState<string | null>(null)

  // Add modal
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [adding, setAdding] = useState(false)

  // Detail drawer
  const [detailPassId, setDetailPassId] = useState<string | null>(null)

  const createNamedPass = useMutation(api.passes.createNamedPass)

  const filtered = useMemo(() => {
    return passes.filter((p) => {
      const s = search.toLowerCase().trim()
      const matchSearch =
        !s ||
        p.id.toLowerCase().includes(s) ||
        (p.customerName && p.customerName.toLowerCase().includes(s)) ||
        (p.customerEmail && p.customerEmail.toLowerCase().includes(s)) ||
        (p.customerPhone && p.customerPhone.includes(s))
      const matchFilter = filter === 'all' || (filter === 'reward_ready' && p.stampCount >= (stampGoal || 999))
      return matchSearch && matchFilter
    })
  }, [passes, search, filter, stampGoal])

  const rewardReadyCount = useMemo(
    () => passes.filter((p) => p.stampCount >= (stampGoal || 999)).length,
    [passes, stampGoal]
  )

  async function handleRedeem(passId: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    if (!initialLocations[0]) {
      toast({ title: 'No location configured', variant: 'destructive' })
      return
    }
    setRedeemingId(passId)
    const res = await fetch('/api/stamps/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passId, locationId: initialLocations[0].id }),
    })
    if (res.ok) {
      toast({ title: 'Reward redeemed!', variant: 'success' })
      // useQuery auto-updates — no reload needed
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
      await createNamedPass({
        customerName: trimmed,
        customerEmail: newEmail.trim() || undefined,
        customerPhone: newPhone.trim() || undefined,
      })
      toast({ title: `"${trimmed}" added`, variant: 'success' })
      setAddOpen(false)
      setNewName(''); setNewEmail(''); setNewPhone('')
      // useQuery auto-updates list
    } catch (err) {
      toast({ title: (err as Error).message || 'Could not add', variant: 'destructive' })
    } finally {
      setAdding(false)
    }
  }

  function exportCSV() {
    if (passes.length === 0) {
      toast({ title: 'No customers to export', variant: 'destructive' })
      return
    }
    const rows = [
      ['Pass ID', 'Name', 'Email', 'Phone', 'Device', 'Stamps', 'Stamp Goal', 'Joined', 'Last Visit'],
      ...passes.map(p => [
        p.id,
        p.customerName ?? '',
        p.customerEmail ?? '',
        p.customerPhone ?? '',
        p.device ?? '',
        p.stampCount.toString(),
        stampGoal.toString(),
        new Date(p.joinedAt).toISOString(),
        p.lastVisitedAt ? new Date(p.lastVisitedAt).toISOString() : '',
      ]),
    ]
    const csv = rows.map(r => r.map(cell => {
      const v = String(cell)
      return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    }).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast({ title: `Exported ${passes.length} customers`, variant: 'success' })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isLoading ? 'Loading…' : `${passes.length} total ${passes.length === 1 ? 'pass' : 'passes'} issued`}
            {!isLoading && passes.length > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {rewardReadyCount > 0 && (
            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2">
              <span className="text-yellow-600 text-sm font-semibold">🎉 {rewardReadyCount} ready</span>
            </div>
          )}
          <Button variant="outline" onClick={exportCSV} className="gap-1.5">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
          <Button variant="primary" onClick={() => setAddOpen(true)} className="gap-1.5">
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Add customer</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, phone, or pass ID…"
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
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3 hidden md:table-cell">Contact</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3 hidden lg:table-cell">Device</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Stamps</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3 hidden sm:table-cell">Last Visit</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                    {passes.length === 0 ? 'No customers yet — share your QR code or add one manually' : 'No customers match your filters'}
                  </td>
                </tr>
              ) : (
                filtered.map((pass) => {
                  const isReady = pass.stampCount >= (stampGoal || 999)
                  return (
                    <tr
                      key={pass.id}
                      onClick={() => setDetailPassId(pass.id)}
                      className={`cursor-pointer hover:bg-gray-50 transition-colors ${isReady ? 'bg-yellow-50/50' : ''}`}
                    >
                      <td className="px-5 py-4">
                        {pass.customerName ? (
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 flex-shrink-0">
                              {pass.customerName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-gray-900">{pass.customerName}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400">
                            <User className="w-4 h-4" />
                            <span className="text-sm italic">Anonymous</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <div className="text-xs text-gray-500 space-y-0.5">
                          {pass.customerEmail && <div className="flex items-center gap-1"><Mail className="w-3 h-3" />{pass.customerEmail}</div>}
                          {pass.customerPhone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{pass.customerPhone}</div>}
                          {!pass.customerEmail && !pass.customerPhone && <span className="text-gray-300">—</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5">
                          {pass.device === 'apple' ? <Apple className="w-4 h-4 text-gray-600" /> : <Smartphone className="w-4 h-4 text-gray-600" />}
                          <span className="text-sm text-gray-600 capitalize">{pass.device || '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min((pass.stampCount / (stampGoal || 1)) * 100, 100)}%`,
                                backgroundColor: isReady ? '#f59e0b' : '#6366f1',
                              }}
                            />
                          </div>
                          <span className="text-sm font-semibold tabular-nums text-gray-900 whitespace-nowrap">
                            {pass.stampCount}/{stampGoal}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500 hidden sm:table-cell">
                        {pass.lastVisitedAt ? new Date(pass.lastVisitedAt).toLocaleDateString() : '—'}
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
                            {redeemingId === pass.id ? '…' : 'Redeem'}
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
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setAddOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
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
              <p className="text-sm text-gray-500 mt-0.5">Create a named loyalty pass. Contact info is optional.</p>
            </div>
            <div className="space-y-3 mb-5">
              <div className="space-y-1.5">
                <Label htmlFor="new-name">Name <span className="text-red-500">*</span></Label>
                <Input id="new-name" placeholder="John Doe" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={60} autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-email">Email</Label>
                <Input id="new-email" type="email" placeholder="john@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-phone">Phone</Label>
                <Input id="new-phone" type="tel" placeholder="+62 812 3456 7890" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} maxLength={30} />
              </div>
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
  const updateCustomer = useMutation(api.passes.updateCustomer)
  const deleteCustomer = useMutation(api.passes.deleteCustomer)

  const [editMode, setEditMode] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Local edit form state (initialized from data when entering edit mode)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')

  function startEdit() {
    if (!data) return
    setEditName(data.pass.customerName ?? '')
    setEditEmail(data.pass.customerEmail ?? '')
    setEditPhone(data.pass.customerPhone ?? '')
    setEditMode(true)
  }

  async function handleSaveEdit() {
    setSavingEdit(true)
    try {
      await updateCustomer({
        passId,
        customerName: editName,
        customerEmail: editEmail,
        customerPhone: editPhone,
      })
      toast({ title: 'Customer updated', variant: 'success' })
      setEditMode(false)
    } catch (err) {
      toast({ title: (err as Error).message || 'Update failed', variant: 'destructive' })
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteCustomer({ passId })
      toast({ title: 'Customer deleted', variant: 'success' })
      onClose()
    } catch (err) {
      toast({ title: (err as Error).message || 'Delete failed', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

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
  const email = data?.pass.customerEmail ?? undefined
  const phone = data?.pass.customerPhone ?? undefined

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white w-full sm:w-[460px] h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-semibold text-gray-900">Customer detail</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!data ? (
          <div className="p-10 text-center">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Identity / Edit */}
            {!editMode ? (
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-700">
                  {data.pass.customerName ? data.pass.customerName.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold text-gray-900 truncate">
                    {data.pass.customerName || <span className="italic text-gray-400">Anonymous</span>}
                  </p>
                  {email && <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" />{email}</p>}
                  {phone && <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{phone}</p>}
                  <p className="text-xs text-gray-400 font-mono truncate mt-1">{data.pass.id}</p>
                </div>
                <button onClick={startEdit} aria-label="Edit" className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50">
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Edit customer</p>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name" className="text-xs">Name</Label>
                  <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-email" className="text-xs">Email</Label>
                  <Input id="edit-email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="email@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-phone" className="text-xs">Phone</Label>
                  <Input id="edit-phone" type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+62…" />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setEditMode(false)} className="flex-1">Cancel</Button>
                  <Button variant="primary" size="sm" onClick={handleSaveEdit} disabled={savingEdit} className="flex-1">
                    {savingEdit ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </div>
            )}

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
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((stampCount / Math.max(stampGoal, 1)) * 100, 100)}%`,
                    backgroundColor: isReady ? '#f59e0b' : '#6366f1',
                  }}
                />
              </div>
              {isReady && (
                <Button variant="primary" onClick={onRedeem} disabled={redeeming} className="w-full mt-3 gap-1.5">
                  <Gift className="w-4 h-4" />
                  {redeeming ? 'Redeeming…' : `Redeem (${data.card.rewardDescription})`}
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

            {/* Danger zone */}
            <div className="pt-2 border-t border-gray-100">
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50 py-2 rounded-lg flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete this customer
                </button>
              ) : (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">
                      This will permanently delete this customer and all their stamp history. This cannot be undone.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)} className="flex-1">Cancel</Button>
                    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting} className="flex-1">
                      {deleting ? 'Deleting…' : 'Delete forever'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
