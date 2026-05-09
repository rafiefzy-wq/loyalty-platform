import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ScannerClient } from './scanner-client'

export default async function ScannerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/scanner')

  // Fetch employee record
  const { data: employee } = await supabase
    .from('employees')
    .select('*, businesses(*)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!employee) {
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

  // Fetch locations for this employee
  const locationQuery = supabase.from('locations').select('*').eq('business_id', employee.business_id).eq('is_active', true)
  if (employee.location_id) locationQuery.eq('id', employee.location_id)

  const { data: locations } = await locationQuery

  const business = (employee as any).businesses

  return (
    <ScannerClient
      employee={employee}
      business={business}
      locations={locations || []}
    />
  )
}
