'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/lib/hooks/use-toast'
import { Pencil, X, Gift } from 'lucide-react'

interface Props {
  initialStampGoal: number
  initialReward: string
}

export function QuickEditRewardButton({ initialStampGoal, initialReward }: Props) {
  const [open, setOpen] = useState(false)
  const [stampGoal, setStampGoal] = useState(initialStampGoal)
  const [reward, setReward] = useState(initialReward)
  const [saving, setSaving] = useState(false)

  const updateReward = useMutation(api.businesses.updateRewardQuick)

  async function handleSave() {
    const trimmed = reward.trim()
    if (!trimmed) {
      toast({ title: 'Reward description is required', variant: 'destructive' })
      return
    }
    if (stampGoal < 1 || stampGoal > 30) {
      toast({ title: 'Stamps must be between 1 and 30', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await updateReward({ stampGoal, rewardDescription: trimmed })
      toast({ title: 'Reward updated', variant: 'success' })
      setOpen(false)
      window.location.reload()
    } catch (err) {
      toast({ title: (err as Error).message || 'Update failed', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 hover:underline"
      >
        <Pencil className="w-3 h-3" />
        Quick edit
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="mb-5">
              <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center mb-3">
                <Gift className="w-5 h-5 text-yellow-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Quick edit reward</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Adjust the reward without leaving the dashboard.
              </p>
            </div>
            <div className="space-y-4 mb-5">
              <div className="space-y-1.5">
                <Label htmlFor="qe-stamps">Stamps needed</Label>
                <Input
                  id="qe-stamps"
                  type="number"
                  min={1}
                  max={30}
                  value={stampGoal}
                  onChange={(e) => setStampGoal(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qe-reward">Reward description</Label>
                <Input
                  id="qe-reward"
                  placeholder="e.g. 1 free coffee"
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                  maxLength={60}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              For deeper changes (colors, fonts, images) go to{' '}
              <a href="/dashboard/design" className="text-indigo-600 hover:underline">Card Design</a>.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
              <Button variant="primary" onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
