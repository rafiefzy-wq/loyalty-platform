'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function AcceptInviteClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'found' | 'error' | 'accepting' | 'done'>('loading')
  const [invitation, setInvitation] = useState<any>(null)

  useEffect(() => {
    if (!token) { setStatus('error'); return }
    fetch(`/api/employees/accept?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.invitation) { setInvitation(d.invitation); setStatus('found') }
        else setStatus('error')
      })
      .catch(() => setStatus('error'))
  }, [token])

  async function handleAccept() {
    setStatus('accepting')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/register?redirectTo=/invite/accept?token=${token}`)
      return
    }
    const res = await fetch('/api/employees/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    if (res.ok) {
      setStatus('done')
      setTimeout(() => router.push('/scanner'), 2000)
    } else {
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="text-center max-w-sm">
        {status === 'loading' && <p className="text-gray-500">Loading invitation…</p>}
        {status === 'error' && (
          <>
            <p className="text-3xl mb-3">❌</p>
            <h1 className="text-xl font-bold text-gray-900">Invalid invitation</h1>
            <p className="text-gray-500 text-sm mt-2">This link may have expired or already been used.</p>
          </>
        )}
        {status === 'found' && invitation && (
          <>
            <p className="text-3xl mb-3">🎫</p>
            <h1 className="text-xl font-bold text-gray-900">Team invitation</h1>
            <p className="text-gray-600 mt-2 mb-6">
              You've been invited to join <strong>{invitation.business_name}</strong> as a{' '}
              <strong>{invitation.role}</strong>.
            </p>
            <Button variant="primary" size="lg" onClick={handleAccept}>
              Accept & join team
            </Button>
          </>
        )}
        {status === 'accepting' && <p className="text-gray-500">Joining team…</p>}
        {status === 'done' && (
          <>
            <p className="text-3xl mb-3">✅</p>
            <h1 className="text-xl font-bold text-gray-900">You're in!</h1>
            <p className="text-gray-500 text-sm mt-2">Redirecting to scanner…</p>
          </>
        )}
      </div>
    </div>
  )
}
