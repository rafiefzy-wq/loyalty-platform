'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { toast } from '@/lib/hooks/use-toast'
import {
  Plus, Check, Trash2, X, Loader2, Users, Gift, AlertTriangle, Sparkles, Pencil,
  Copy, Archive, Play, Pause, Stamp, Clock, MapPin, TrendingUp, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

type Status = 'active' | 'draft' | 'archived'

type Program = {
  id: string
  name: string
  stampGoal: number
  rewardDescription: string
  backgroundColor: string
  foregroundColor: string
  status: Status
  customerCount: number
  totalStamps: number
  totalRedemptions: number
  recent7Redemptions: number
  recent30Redemptions: number
  progressPct: number
  createdAt: number
}

const STATUS_STYLES: Record<Status, { label: string; classes: string; dot: string }> = {
  active: { label: 'Active', classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', dot: 'bg-green-500' },
  draft: { label: 'Draft', classes: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', dot: 'bg-gray-400' },
  archived: { label: 'Archived', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', dot: 'bg-amber-500' },
}

export function ProgramsClient() {
  const programs = useQuery(api.programs.listMyPrograms)
  const isLoading = programs === undefined

  const createProgram = useMutation(api.programs.createProgram)
  const setProgramStatus = useMutation(api.programs.setProgramStatus)
  const duplicateProgram = useMutation(api.programs.duplicateProgram)
  const deleteProgram = useMutation(api.programs.deleteProgram)
  const renameProgram = useMutation(api.programs.renameProgram)
  const bulkSetStatus = useMutation(api.programs.bulkSetStatus)
  const bulkDeletePrograms = useMutation(api.programs.bulkDeletePrograms)

  // Create modal
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [stampGoal, setStampGoal] = useState(10)
  const [reward, setReward] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [creating, setCreating] = useState(false)

  // Inline rename
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')

  // Single delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all')

  // Detail drawer
  const [detailId, setDetailId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!programs) return []
    if (statusFilter === 'all') return programs
    return programs.filter((p) => p.status === statusFilter)
  }, [programs, statusFilter])

  const counts = useMemo(() => {
    const c = { all: 0, active: 0, draft: 0, archived: 0 }
    if (programs) {
      c.all = programs.length
      for (const p of programs) c[p.status]++
    }
    return c
  }, [programs])

  function toggleSelect(id: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearSelection() { setSelectedIds(new Set()) }

  function selectAllVisible() {
    setSelectedIds(new Set(filtered.map(p => p.id)))
  }

  // === Handlers ===
  async function handleCreate() {
    if (!name.trim() || !reward.trim()) {
      toast({ title: 'Name and reward are required', variant: 'destructive' })
      return
    }
    setCreating(true)
    try {
      await createProgram({
        name: name.trim(),
        stampGoal,
        rewardDescription: reward.trim(),
        backgroundColor: color,
        status: 'draft',
      })
      toast({ title: `"${name.trim()}" created as draft`, variant: 'success' })
      setCreateOpen(false)
      setName(''); setReward(''); setStampGoal(10); setColor('#6366f1')
    } catch (err) {
      toast({ title: (err as Error).message || 'Create failed', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  async function handleSetStatus(p: Program, status: Status) {
    try {
      await setProgramStatus({ cardId: p.id as Id<'loyaltyCards'>, status })
      toast({ title: `"${p.name}" → ${STATUS_STYLES[status].label}`, variant: 'success' })
    } catch (err) {
      toast({ title: (err as Error).message || 'Status update failed', variant: 'destructive' })
    }
  }

  async function handleDuplicate(p: Program) {
    try {
      await duplicateProgram({ cardId: p.id as Id<'loyaltyCards'> })
      toast({ title: `Duplicated "${p.name}"`, variant: 'success' })
    } catch (err) {
      toast({ title: (err as Error).message || 'Duplicate failed', variant: 'destructive' })
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deleteProgram({ cardId: deleteId as Id<'loyaltyCards'> })
      toast({ title: 'Program deleted', variant: 'success' })
      setDeleteId(null)
    } catch (err) {
      toast({ title: (err as Error).message || 'Delete failed', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  async function handleSaveRename(p: Program) {
    const trimmed = renameDraft.trim()
    if (!trimmed || trimmed === p.name) {
      setRenamingId(null)
      return
    }
    try {
      await renameProgram({ cardId: p.id as Id<'loyaltyCards'>, name: trimmed })
      toast({ title: 'Renamed', variant: 'success' })
      setRenamingId(null)
    } catch (err) {
      toast({ title: (err as Error).message || 'Rename failed', variant: 'destructive' })
    }
  }

  async function handleBulkAction(action: 'activate' | 'draft' | 'archive') {
    if (selectedIds.size === 0) return
    setBulkBusy(true)
    try {
      const statusMap = { activate: 'active', draft: 'draft', archive: 'archived' } as const
      await bulkSetStatus({
        cardIds: Array.from(selectedIds) as Id<'loyaltyCards'>[],
        status: statusMap[action] as Status,
      })
      toast({ title: `${selectedIds.size} programs updated`, variant: 'success' })
      clearSelection()
    } catch (err) {
      toast({ title: (err as Error).message || 'Bulk update failed', variant: 'destructive' })
    } finally {
      setBulkBusy(false)
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    setBulkBusy(true)
    try {
      await bulkDeletePrograms({ cardIds: Array.from(selectedIds) as Id<'loyaltyCards'>[] })
      toast({ title: `${selectedIds.size} programs deleted`, variant: 'success' })
      clearSelection()
      setBulkDeleteOpen(false)
    } catch (err) {
      toast({ title: (err as Error).message || 'Bulk delete failed', variant: 'destructive' })
    } finally {
      setBulkBusy(false)
    }
  }

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Loyalty Programs</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Manage multiple programs — each has its own customers, stamps, and reward.
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          New program
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          ['all', 'All', counts.all],
          ['active', 'Active', counts.active],
          ['draft', 'Draft', counts.draft],
          ['archived', 'Archived', counts.archived],
        ] as const).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => { setStatusFilter(key); clearSelection() }}
            className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
              statusFilter === key
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                : 'bg-white dark:bg-[#16161e] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
          >
            {label}
            <span className="text-xs opacity-70">{count}</span>
          </button>
        ))}
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
      ) : programs.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <div className="text-center py-12 px-6">
            <Sparkles className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No programs yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-5">Start by creating your first loyalty program.</p>
            <Button variant="primary" onClick={() => setCreateOpen(true)}>Create first program</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const isSelected = selectedIds.has(p.id)
            const status = STATUS_STYLES[p.status]
            return (
              <Card
                key={p.id}
                onClick={() => setDetailId(p.id)}
                className={`border-0 shadow-sm overflow-hidden cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
              >
                <div className="relative h-24 px-4 py-3 flex items-end" style={{ backgroundColor: p.backgroundColor, color: p.foregroundColor }}>
                  {/* Multi-select checkbox */}
                  <button
                    onClick={(e) => toggleSelect(p.id, e)}
                    aria-label={isSelected ? 'Deselect' : 'Select'}
                    className={`absolute top-3 left-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-white border-white' : 'bg-white/20 border-white/60 hover:bg-white/30 backdrop-blur'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>

                  {/* Status badge */}
                  <span className={`absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-full ${status.classes}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>

                  <p className="text-xs uppercase tracking-wider opacity-70">Loyalty Program</p>
                </div>

                <div className="p-4 space-y-3">
                  {renamingId === p.id ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRename(p); if (e.key === 'Escape') setRenamingId(null) }}
                        onBlur={() => handleSaveRename(p)}
                        className="h-8 text-sm"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{p.name}</h3>
                      <button
                        onClick={(e) => { e.stopPropagation(); setRenamingId(p.id); setRenameDraft(p.name) }}
                        aria-label="Rename"
                        className="p-1 rounded text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Mini stats grid */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-2">
                      <p className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Holders</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums flex items-center justify-center gap-0.5">
                        <Users className="w-2.5 h-2.5 text-gray-400" />
                        {p.customerCount}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-2">
                      <p className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Stamps</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums flex items-center justify-center gap-0.5">
                        <Stamp className="w-2.5 h-2.5 text-gray-400" />
                        {p.totalStamps}
                      </p>
                    </div>
                    <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-2">
                      <p className="text-[9px] uppercase tracking-wider text-yellow-700 dark:text-yellow-500">Rewards</p>
                      <p className="text-sm font-bold text-yellow-700 dark:text-yellow-400 tabular-nums flex items-center justify-center gap-0.5">
                        <Gift className="w-2.5 h-2.5" />
                        {p.totalRedemptions}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Stamp progress</p>
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 tabular-nums">{p.progressPct}%</p>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${p.progressPct}%`, backgroundColor: p.backgroundColor }}
                      />
                    </div>
                  </div>

                  {/* Recent activity indicator */}
                  {p.recent7Redemptions > 0 && (
                    <div className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded-full">
                      <TrendingUp className="w-2.5 h-2.5" />
                      {p.recent7Redemptions} redeemed this week
                    </div>
                  )}

                  <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/40 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-yellow-700 dark:text-yellow-500 font-medium flex items-center gap-1">
                      <Gift className="w-3 h-3" />
                      Reward
                    </p>
                    <p className="text-sm text-yellow-900 dark:text-yellow-200 font-medium">{p.rewardDescription}</p>
                  </div>

                  {/* Quick actions */}
                  <div className="flex gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                    {p.status !== 'active' && (
                      <Button size="sm" variant="primary" onClick={() => handleSetStatus(p, 'active')} className="flex-1 gap-1 h-7 text-xs">
                        <Play className="w-3 h-3" /> Activate
                      </Button>
                    )}
                    {p.status === 'active' && (
                      <Button size="sm" variant="outline" onClick={() => handleSetStatus(p, 'draft')} className="flex-1 gap-1 h-7 text-xs">
                        <Pause className="w-3 h-3" /> Pause
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleDuplicate(p)} className="h-7 text-xs px-2" aria-label="Duplicate">
                      <Copy className="w-3 h-3" />
                    </Button>
                    {p.status !== 'archived' && (
                      <Button size="sm" variant="outline" onClick={() => handleSetStatus(p, 'archived')} className="h-7 text-xs px-2" aria-label="Archive">
                        <Archive className="w-3 h-3" />
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setDeleteId(p.id)} className="h-7 text-xs px-2" aria-label="Delete">
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Bulk actions toolbar (sticky bottom) */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom duration-200 max-w-md w-[calc(100%-2rem)]">
          <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-2xl shadow-2xl p-3 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium px-2">{selectedIds.size} selected</span>
            <div className="flex gap-1 flex-1 justify-end flex-wrap">
              <button
                onClick={selectAllVisible}
                disabled={bulkBusy}
                className="text-xs px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                Select all
              </button>
              <button
                onClick={() => handleBulkAction('activate')}
                disabled={bulkBusy}
                title="Sets the first selected program as the active one"
                className="text-xs px-2.5 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 transition-colors inline-flex items-center gap-1"
              >
                <Play className="w-3 h-3" />
                Activate
              </button>
              <button
                onClick={() => handleBulkAction('draft')}
                disabled={bulkBusy}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors inline-flex items-center gap-1"
              >
                <Pause className="w-3 h-3" />
                Draft
              </button>
              <button
                onClick={() => handleBulkAction('archive')}
                disabled={bulkBusy}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 transition-colors inline-flex items-center gap-1"
              >
                <Archive className="w-3 h-3" />
                Archive
              </button>
              <button
                onClick={() => setBulkDeleteOpen(true)}
                disabled={bulkBusy}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 transition-colors inline-flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
              <button
                onClick={clearSelection}
                disabled={bulkBusy}
                aria-label="Clear selection"
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setCreateOpen(false)} role="dialog" aria-modal="true"
        >
          <div className="bg-white dark:bg-[#16161e] rounded-2xl max-w-sm w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setCreateOpen(false)} aria-label="Close" className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
              <X className="w-5 h-5" />
            </button>
            <div className="mb-5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">New loyalty program</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Starts as draft — activate when ready.</p>
            </div>
            <div className="space-y-4 mb-5">
              <div className="space-y-1.5">
                <Label htmlFor="np-name">Program name *</Label>
                <Input id="np-name" placeholder="e.g. Coffee Club" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="np-goal">Stamps needed</Label>
                  <Input id="np-goal" type="number" min={1} max={30} value={stampGoal} onChange={(e) => setStampGoal(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="np-color">Color</Label>
                  <input id="np-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-10 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer p-0.5" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="np-reward">Reward *</Label>
                <Input id="np-reward" placeholder="e.g. 1 free coffee" value={reward} onChange={(e) => setReward(e.target.value)} maxLength={60} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} className="flex-1">Cancel</Button>
              <Button variant="primary" onClick={handleCreate} disabled={creating} className="flex-1">
                {creating ? 'Creating…' : 'Create program'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Single delete confirm */}
      {deleteId && (
        <DeleteConfirm
          onCancel={() => setDeleteId(null)}
          onConfirm={handleDelete}
          busy={deleting}
          title="Delete this program?"
          body="All customers and stamp history for this program will be permanently deleted. This cannot be undone."
        />
      )}

      {/* Bulk delete confirm */}
      {bulkDeleteOpen && (
        <DeleteConfirm
          onCancel={() => setBulkDeleteOpen(false)}
          onConfirm={handleBulkDelete}
          busy={bulkBusy}
          title={`Delete ${selectedIds.size} programs?`}
          body="All customers and stamp history for these programs will be permanently deleted."
        />
      )}

      {/* Detail drawer */}
      {detailId && (
        <ProgramDetailDrawer
          cardId={detailId as Id<'loyaltyCards'>}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  )
}

// ============================================================
// Reusable delete confirmation modal
// ============================================================
function DeleteConfirm({
  onCancel, onConfirm, busy, title, body,
}: {
  onCancel: () => void; onConfirm: () => void; busy: boolean; title: string; body: string
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-[#16161e] rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{body}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy} className="flex-1">
            {busy ? 'Deleting…' : 'Delete forever'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Side drawer with full card detail, customer usage, activity history
// ============================================================
function ProgramDetailDrawer({
  cardId, onClose,
}: {
  cardId: Id<'loyaltyCards'>; onClose: () => void
}) {
  const data = useQuery(api.programs.getProgramDetail, { cardId })

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

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200" onClick={onClose} role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white dark:bg-[#16161e] w-full sm:w-[480px] h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-[#16161e] border-b border-gray-100 dark:border-gray-800 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Program detail</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!data ? (
          <div className="p-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Hero card with brand color */}
            <div
              className="rounded-2xl p-5"
              style={{ backgroundColor: data.card.backgroundColor, color: data.card.foregroundColor }}
            >
              <p className="text-xs uppercase tracking-wider opacity-70">Loyalty Program</p>
              <h3 className="text-xl font-bold mt-1">{data.card.name}</h3>
              <div className="flex items-center gap-2 mt-3">
                <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-full ${STATUS_STYLES[data.card.status].classes}`}>
                  {STATUS_STYLES[data.card.status].label}
                </span>
                <span className="text-xs opacity-80">Created {timeAgo(data.card.createdAt)}</span>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Card holders', value: data.stats.customerCount, icon: Users, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' },
                { label: 'Stamps issued', value: data.stats.totalStamps, icon: Stamp, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400' },
                { label: 'Rewards redeemed', value: data.stats.totalRedemptions, icon: Gift, color: 'text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400' },
                { label: 'This week', value: data.stats.recent7Redemptions, icon: TrendingUp, color: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1c1c26] p-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{value}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{label}</p>
                </div>
              ))}
            </div>

            {/* Reward info */}
            <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/40 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-yellow-700 dark:text-yellow-500 font-medium mb-1">
                <Gift className="w-3 h-3 inline mr-1" />
                Reward at {data.card.stampGoal} stamps
              </p>
              <p className="text-base font-semibold text-yellow-900 dark:text-yellow-200">{data.card.rewardDescription}</p>
            </div>

            {/* Top customers */}
            {data.topCustomers.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Top customers</h3>
                  <span className="text-xs text-gray-400">by stamps</span>
                </div>
                <ul className="space-y-2">
                  {data.topCustomers.map((c) => (
                    <li key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#1c1c26] border border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex-shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {c.isReady && (
                          <span className="text-[10px] font-medium text-yellow-700 bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-300 px-1.5 py-0.5 rounded-full">🎉</span>
                        )}
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 tabular-nums">{c.stampCount}/{c.stampGoal}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Activity history */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent activity</h3>
                <span className="text-xs text-gray-400">{data.recentActivity.length} events</span>
              </div>
              {data.recentActivity.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6 bg-gray-50 dark:bg-gray-900/40 rounded-xl">No activity yet</p>
              ) : (
                <ul className="space-y-2">
                  {data.recentActivity.map((t) => (
                    <li key={t.id} className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-[#1c1c26] border border-gray-100 dark:border-gray-800">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${t.type === 'reward_redeemed' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'}`}>
                        {t.type === 'reward_redeemed' ? <Gift className="w-4 h-4" /> : <Stamp className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {t.type === 'reward_redeemed' ? 'Reward redeemed' : 'Stamp added'}
                          {t.customerName && <span className="text-gray-500 dark:text-gray-400"> · {t.customerName}</span>}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(t.createdAt)}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{t.locationName}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <a
              href="/dashboard/customers"
              className="block text-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline pt-2"
            >
              View all customers for this program <ChevronRight className="w-3.5 h-3.5 inline" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
