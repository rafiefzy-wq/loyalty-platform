import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { redirect } from 'next/navigation'
import { ProgramsClient } from './programs-client'

export const dynamic = 'force-dynamic'

export default async function ProgramsPage() {
  const token = await convexAuthNextjsToken()
  if (!token) redirect('/login')
  return <ProgramsClient />
}
