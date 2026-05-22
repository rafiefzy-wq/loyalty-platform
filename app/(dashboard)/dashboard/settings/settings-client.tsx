'use client'

import { useState } from 'react'
import type { Business, Location } from '@/lib/types'
import { toast } from '@/lib/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'

interface Props {
  business: Business
  locations: Location[]
}

export function SettingsClient({ business, locations: initialLocations }: Props) {
  const [locations, setLocations] = useState(initialLocations)
  const [businessName, setBusinessName] = useState(business.name)
  const [saving, setSaving] = useState(false)
  const [addingLocation, setAddingLocation] = useState(false)
  const [newLoc, setNewLoc] = useState({ name: '', address: '', city: '', country: 'UK' })

  async function saveBusinessName() {
    setSaving(true)
    const res = await fetch('/api/businesses/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: businessName }),
    })
    if (res.ok) toast({ title: 'Business name updated', variant: 'success' })
    else toast({ title: 'Failed to save', variant: 'destructive' })
    setSaving(false)
  }

  async function addLocation() {
    if (!newLoc.name) return
    const res = await fetch('/api/businesses/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLoc),
    })
    if (res.ok) {
      const { location } = await res.json()
      setLocations([...locations, location])
      setNewLoc({ name: '', address: '', city: '', country: 'UK' })
      setAddingLocation(false)
      toast({ title: 'Location added', variant: 'success' })
    }
  }

  async function deleteLocation(id: string) {
    const res = await fetch(`/api/businesses/locations/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setLocations(locations.filter((l) => l.id !== id))
      toast({ title: 'Location removed' })
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage your business profile and locations</p>
      </div>

      {/* Business profile */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Business Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Business name</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500 dark:text-gray-400">Plan: <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">{business.plan.replace('_', ' ')}</span></div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
              {business.plan === 'free_trial' ? 'Free Trial' : 'Active'}
            </span>
          </div>
          <Button variant="primary" onClick={saveBusinessName} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Locations */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Locations</CardTitle>
            <CardDescription>Add or remove business locations</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setAddingLocation(!addingLocation)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {addingLocation && (
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label>Location name</Label>
                  <Input placeholder="e.g. City Centre" value={newLoc.name} onChange={(e) => setNewLoc({ ...newLoc, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>City</Label>
                  <Input placeholder="London" value={newLoc.city} onChange={(e) => setNewLoc({ ...newLoc, city: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Country</Label>
                  <Input value={newLoc.country} onChange={(e) => setNewLoc({ ...newLoc, country: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={addLocation}>Add location</Button>
                <Button variant="outline" size="sm" onClick={() => setAddingLocation(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {locations.map((loc) => (
            <div key={loc.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#16161e]">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{loc.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{[loc.city, loc.country].filter(Boolean).join(', ')}</p>
              </div>
              {locations.length > 1 && (
                <button onClick={() => deleteLocation(loc.id)} className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Billing placeholder */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100">
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Upgrade your plan</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            You're on the Free Trial. Upgrade to unlock unlimited customers, analytics, and team members.
          </p>
          <Button variant="primary" disabled>
            View plans (coming soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
