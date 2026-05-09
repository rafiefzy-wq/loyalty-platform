import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessName, brandColor, foregroundColor, labelColor, fontChoice, stampGoal, rewardDescription, logoUrl, stripImageUrl } = await request.json()

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  await supabase.from('businesses').update({
    name: businessName,
    brand_color: brandColor,
    font_choice: fontChoice,
    logo_url: logoUrl || null,
  }).eq('id', business.id)

  await supabase.from('loyalty_cards').update({
    background_color: brandColor,
    foreground_color: foregroundColor,
    label_color: labelColor,
    stamp_goal: stampGoal,
    reward_description: rewardDescription,
    strip_image_url: stripImageUrl || null,
    icon_url: logoUrl || null,
  }).eq('business_id', business.id).eq('is_active', true)

  return NextResponse.json({ ok: true })
}
