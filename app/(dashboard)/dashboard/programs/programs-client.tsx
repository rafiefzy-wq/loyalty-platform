'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { toast } from '@/lib/hooks/use-toast'
import {
  Plus, Check, Trash2, X, Loader2, Users, Gift, AlertTriangle, Sparkles, Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

type Program = {
  id: string
  name: string
  stampGoal: number
  rewardDescription: string
  backgroundColor: string
  foregroundColor: string
  isActive: boolean
  customerCount: number
  createdAt: number
}

export function ProgramsClient() {
  const programs = useQuery(api.programs.listMyPrograms)
  const isLoading = programs === undefined

  const createProgram = useMutation(api.programs.createProgram)
  const setActiveProgram = useMutation(api.programs.setActiveProgram)
  const deleteProgram = useMutation(api.programs.deleteProgram)
  const renameProgram = useMutation(api.programs.renameProgram)

  // Create modal
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [stampGoal, setStampGoal] = useState(10)
  const [reward, setReward] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [creating, setCreating] = useState(false)

  // Per-program inline rename
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

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
      })
      toast({ title: `Program "${name.trim()}" created`, variant: 'success' })
      setCreateOpen(false)
      setName(''); setReward(''); setStampGoal(10); setColor('#6366f1')
    } catch (err) {
      toast({ title: (err as Error).message || 'Create failed', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  async function handleActivate(p: Program) {
    if (p.isActive) return
    try {
      await setActiveProgram({ cardId: p.id as Id<'loyaltyCards'> })
      toast({ title: `"${p.name}" is now active`, variant: 'success' })
    } catch (err) {
      toast({ title: (err as Error).message || 'Activation failed', variant: 'destructive' })
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Loyalty Programs</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Run multiple loyalty programs in parallel — each has its own customers, stamps, and reward.
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          New program
        </Button>
      </div>

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
          {programs.map((p) => (
            <Card key={p.id} className="border-0 shadow-sm overflow-hidden">
              <div
                className="h-24 px-4 py-3 flex items-end"
                style={{ backgroundColor: p.backgroundColor, color: p.foregroundColor }}
              >
                {p.isActive && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold bg-white/20 backdrop-blur px-2 py-1 rounded-full">
                    <Check className="w-3 h-3" />
                    Active
                  </span>
                )}
                <p className="text-xs uppercase tracking-wider opacity-70">Loyalty Program</p>
              </div>
              <div className="p-4 space-y-3">
                {renamingId === p.id ? (
                  <div className="flex items-center gap-2">
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
                      onClick={() => { setRenamingId(p.id); setRenameDraft(p.name) }}
                      aria-label="Rename"
                      className="p-1 rounded text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Stamps</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{p.stampGoal}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Customers</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {p.customerCount}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/40 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-yellow-700 dark:text-yellow-500 font-medium flex items-center gap-1">
                    <Gift className="w-3 h-3" />
                    Reward
                  </p>
                  <p className="text-sm text-yellow-900 dark:text-yellow-200 font-medium">{p.rewardDescription}</p>
                </div>

                <div className="flex gap-2 pt-1">
                  {!p.isActive && (
                    <Button size="sm" variant="primary" onClick={() => handleActivate(p)} className="flex-1 gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Activate
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteId(p.id)}
                    className={p.isActive ? 'flex-1' : ''}
                    aria-label="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create modal */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setCreateOpen(false)}
          role="dialog" aria-modal="true"
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
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Create a new program — you can activate it later.</p>
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
                  <input
                    id="np-color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-10 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer p-0.5"
                  />
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

      {/* Delete confirm */}
      {deleteId && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setDeleteId(null)}
          role="dialog" aria-modal="true"
        >
          <div className="bg-white dark:bg-[#16161e] rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Delete this program?</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  All customers and stamp history for this program will be permanently deleted. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="flex-1">
                {deleting ? 'Deleting…' : 'Delete forever'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
