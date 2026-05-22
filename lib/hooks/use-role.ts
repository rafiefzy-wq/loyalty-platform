'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

export type Role = 'owner' | 'manager' | 'staff'

const ROLE_RANK: Record<Role, number> = { staff: 0, manager: 1, owner: 2 }

export function useMyRole(): { role: Role | null; isLoading: boolean } {
  const role = useQuery(api.employees.getMyRole)
  return { role: role ?? null, isLoading: role === undefined }
}

// Convenience: does the user's role meet or exceed the given minimum?
export function useHasRole(min: Role): boolean {
  const { role } = useMyRole()
  if (!role) return false
  return ROLE_RANK[role] >= ROLE_RANK[min]
}
