import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    // Verify via Authorization header token (cookie may not be set yet right after signUp)
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    let user = null
    if (token) {
      const supabase = await createClient()
      const { data } = await supabase.auth.getUser(token)
      user = data.user
    }

    if (!user) {
      // Fallback to cookie session
      const supabase = await createClient()
      const { data } = await supabase.auth.getUser()
      user = data.user
    }

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const data = await req.json()
    const {
      businessName, businessType, isMultiLocation, locations,
      logoUrl, stripImageUrl, brandColor, secondaryColor,
      foregroundColor, labelColor, fontChoice, stampGoal, rewardDescription,
    } = data

    // Raw service role client — fully bypasses RLS
    const service = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const slug = slugify(businessName) || `business-${Date.now()}`

    // Create business
    const { data: business, error: bErr } = await service
      .from('businesses')
      .insert({
        owner_id: user.id,
        name: businessName,
        slug,
        type: businessType,
        logo_url: logoUrl || null,
        brand_color: brandColor,
        secondary_color: secondaryColor,
        background_image_url: stripImageUrl || null,
        font_choice: fontChoice,
        is_multi_location: isMultiLocation,
        plan: 'free_trial',
      })
      .select()
      .single()

    if (bErr) throw bErr

    // Create locations
    const locData = (locations as any[]).filter((l) => l.name).map((l) => ({
      business_id: business.id,
      name: l.name,
      address: l.address || null,
      city: l.city || null,
      country: l.country || null,
    }))

    const { error: lErr } = await service.from('locations').insert(locData)
    if (lErr) throw lErr

    // Create loyalty card
    const { data: card, error: cErr } = await service
      .from('loyalty_cards')
      .insert({
        business_id: business.id,
        stamp_goal: stampGoal,
        reward_description: rewardDescription,
        card_scope: isMultiLocation ? 'all_locations' : 'per_location',
        background_color: brandColor,
        foreground_color: foregroundColor,
        label_color: labelColor,
        strip_image_url: stripImageUrl || null,
        icon_url: logoUrl || null,
      })
      .select()
      .single()

    if (cErr) throw cErr

    // Create owner employee record
    await service.from('employees').insert({
      business_id: business.id,
      user_id: user.id,
      email: user.email!,
      name: user.user_metadata?.name || null,
      role: 'owner',
    })

    return NextResponse.json({ cardId: card.id })
  } catch (err: unknown) {
    console.error('Onboarding error:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
