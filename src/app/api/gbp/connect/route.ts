import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentBusiness } from '@/lib/businesses/current';
import { createOAuth2Client, buildState, GBP_SCOPE } from '@/lib/gbp/oauth';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  const { business } = await getCurrentBusiness(supabase, user.id);
  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const rawNext  = searchParams.get('next') ?? '';
  const safeNext =
    rawNext.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : '/app/business_dashboard';

  let oauth2Client;
  try {
    oauth2Client = createOAuth2Client();
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Google Business Profile integration is not configured' },
      { status: 503 },
    );
  }

  const state   = buildState(String(business.id), safeNext);
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt:      'consent',
    scope:       [GBP_SCOPE],
    state,
  });

  return NextResponse.redirect(authUrl);
}
