'use client'

import { useState } from 'react'
import type { Employee, EmployeeInvitation, Location } from '@/lib/types'
import { toast } from '@/lib/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus, Mail, Shield, Trash2 } from 'lucide-react'

interface Props {
  employees: Employee[]
  invitations: EmployeeInvitation[]
  locations: Location[]
  businessId: string
}

const ROLES = ['staff', 'manager', 'owner']
const roleColors: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  staff: 'bg-gray-100 text-gray-700',
}

export function TeamClient({ employees, invitations, locations, businessId }: Props) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('staff')
  const [inviteLocationId, setInviteLocationId] = useState('')
  const [sending, setSending] = useState(false)
  const [pendingInvites, setPendingInvites] = useState(invitations)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    const res = await fetch('/api/employees/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole, locationId: inviteLocationId || null }),
    })
    if (res.ok) {
      const data = await res.json()
      toast({ title: `Invitation sent to ${inviteEmail}`, variant: 'success' })
      setPendingInvites([data.invitation, ...pendingInvites])
      setInviteEmail('')
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Failed' }))
      toast({ title: error, variant: 'destructive' })
    }
    setSending(false)
  }

  async function handleCancelInvite(inviteId: string) {
    const res = await fetch(`/api/employees/invite/${inviteId}`, { method: 'DELETE' })
    if (res.ok) {
      setPendingInvites(pendingInvites.filter((i) => i.id !== inviteId))
      toast({ title: 'Invitation cancelled' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
        <p className="text-gray-500 text-sm mt-1">Invite employees to stamp cards from their phones</p>
      </div>

      {/* Invite form */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Invite team member
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="inv-email">Email address</Label>
              <Input
                id="inv-email"
                type="email"
                placeholder="employee@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-role">Role</Label>
              <select
                id="inv-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {ROLES.map((r) => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-loc">Location (optional)</Label>
              <select
                id="inv-loc"
                value={inviteLocationId}
                onChange={(e) => setInviteLocationId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <option value="">All locations</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-4">
              <Button type="submit" variant="primary" disabled={sending} className="gap-2">
                <Mail className="w-4 h-4" />
                {sending ? 'Sending…' : 'Send invitation'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Current team */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Team Members ({employees.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-gray-50">
            {employees.map((emp) => (
              <div key={emp.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-indigo-600">
                      {(emp.name || emp.email)[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{emp.name || 'Unnamed'}</p>
                    <p className="text-xs text-gray-500">{emp.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {emp.location_id && (
                    <span className="text-xs text-gray-400">
                      {locations.find((l) => l.id === emp.location_id)?.name || 'Location'}
                    </span>
                  )}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${roleColors[emp.role] || 'bg-gray-100 text-gray-700'}`}>
                    {emp.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending invitations */}
      {pendingInvites.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-50">
              {pendingInvites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{inv.email}</p>
                    <p className="text-xs text-gray-500">
                      {inv.role} · Expires {new Date(inv.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCancelInvite(inv.id)}
                    className="text-red-400 hover:text-red-600 p-1"
                    title="Cancel invitation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
