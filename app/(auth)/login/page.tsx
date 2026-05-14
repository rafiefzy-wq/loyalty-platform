export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import LoginForm from './login-form'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center text-gray-400 text-sm">Loading…</div>}>
      <LoginForm />
    </Suspense>
  )
}
