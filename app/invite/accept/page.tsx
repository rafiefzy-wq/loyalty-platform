import { Suspense } from 'react'
import AcceptInviteClient from './accept-invite-client'

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>}>
      <AcceptInviteClient />
    </Suspense>
  )
}
