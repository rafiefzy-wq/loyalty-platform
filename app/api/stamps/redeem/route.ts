import { NextRequest, NextResponse } from 'next/server'
import { fetchMutation, fetchQuery } from 'convex/nextjs'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { sendApplePushNotification } from '@/lib/passes/apple-wallet'

export async function POST(request: NextRequest) {
  const token = await convexAuthNextjsToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { passId, locationId } = await request.json()
  if (!passId || !locationId) return NextResponse.json({ error: 'Missing passId or locationId' }, { status: 400 })

  try {
    const employeeData = await fetchQuery(api.employees.getMyEmployee, {}, { token })
    if (!employeeData || !['owner', 'manager'].includes(employeeData.employee.role)) {
      return NextResponse.json({ error: 'Only managers can redeem rewards' }, { status: 403 })
    }

    const passData = await fetchQuery(api.passes.getPass, { passId: passId as Id<'customerPasses'> })
    if (!passData) return NextResponse.json({ error: 'Pass not found' }, { status: 404 })

    if (passData.card.businessId !== employeeData.employee.businessId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (passData.pass.stampCount < passData.card.stampGoal) {
      return NextResponse.json({ error: 'Reward not yet earned' }, { status: 400 })
    }

    await fetchMutation(
      api.passes.redeemReward,
      {
        passId: passId as Id<'customerPasses'>,
        locationId: locationId as Id<'locations'>,
        employeeId: employeeData.employee._id,
      },
      { token }
    )

    // Fire-and-forget wallet updates
    if (passData.pass.applePushToken) {
      sendApplePushNotification(passData.pass.applePushToken).catch(() => {})
    }
    if (passData.pass.googlePassId) {
      const { ConvexHttpClient } = await import('convex/browser')
      const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
      convex.action(api.walletActions.updateGoogleWalletPass, { passId: passId as Id<'customerPasses'> }).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
