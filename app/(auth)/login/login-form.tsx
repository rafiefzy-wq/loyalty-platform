'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuthActions } from '@convex-dev/auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/lib/hooks/use-toast'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'
  const { signIn } = useAuthActions()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await signIn('password', { email: form.email, password: form.password, flow: 'signIn' })
      router.push(redirectTo)
    } catch {
      toast({ title: 'Invalid email or password', variant: 'destructive' })
      setLoading(false)
    }
  }

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to manage your loyalty program</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" type="email" placeholder="jane@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoFocus />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
            </div>
            <Input id="password" type="password" placeholder="Your password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" variant="primary" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
          <p className="text-sm text-gray-500 text-center">
            No account yet?{' '}
            <Link href="/onboarding" className="text-indigo-600 hover:underline font-medium">Start free</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
