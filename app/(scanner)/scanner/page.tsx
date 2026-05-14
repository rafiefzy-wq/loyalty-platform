import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { redirect } from 'next/navigation'
import { ScannerClient } from './scanner-client'

export default async function ScannerPage() {
  const token = await convexAuthNextjsToken()
  if (!token) redirect('/login?redirectTo=/scanner')

  const data = await fetchQuery(api.employees.getMyEmployee, {}, { token })

  if (!data || !data.employee || !data.business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <p className="text-2xl mb-3">🚫</p>
          <h1 className="text-xl font-bold text-gray-900 mb-2">No access</h1>
          <p className="text-gray-500 text-sm">You are not assigned to any business. Contact your manager.</p>
        </div>
      </div>
    )
  }

  const { employee, business, locations } = data

  // Map Convex camelCase to shape ScannerClient expects
  const employeeForClient = {
    id: employee._id,
    role: employee.role,
    location_id: employee.locationId ?? null,
    business_id: employee.businessId,
    email: employee.email,
    name: employee.name ?? null,
    is_active: employee.isActive,
  }

  const businessForClient = {
    id: business._id,
    name: business.name,
    brand_color: business.brandColor,
    logo_url: business.logoUrl ?? null,
    plan: business.plan,
  }

  const locationsForClient = locations.map((l: any) => ({
    id: l._id,
    name: l.name,
    address: l.address ?? null,
    city: l.city ?? null,
    country: l.country ?? null,
    is_active: l.isActive,
    business_id: l.businessId,
  }))

  return (
    <ScannerClient
      employee={employeeForClient as any}
      business={businessForClient as any}
      locations={locationsForClient as any}
    />
  )
}
