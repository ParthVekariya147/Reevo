import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createOAuth2Client, parseState, listAccounts, listLocations } from '@/lib/gbp/oauth';
import { encryptToken } from '@/lib/security/encrypt';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code        = searchParams.get('code');
  const state       = searchParams.get('state');
  const errorParam  = searchParams.get('error');

  if (errorParam) {
    // User denied Google consent
    return NextResponse.redirect(new URL('/app/business_dashboard?gbp_error=denied', origin));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/app/business_dashboard?gbp_error=missing', origin));
  }

  const stateData = parseState(state);
  if (!stateData) {
    return NextResponse.redirect(new URL('/app/business_dashboard?gbp_error=invalid_state', origin));
  }
  const { businessId, next } = stateData;

  let oauth2Client;
  try {
    oauth2Client = createOAuth2Client();
  } catch {
    return NextResponse.redirect(new URL(`${next}?gbp_error=not_configured`, origin));
  }

  // Exchange authorization code for tokens
  let tokens;
  try {
    const result = await oauth2Client.getToken(code);
    tokens = result.tokens;
  } catch (e) {
    console.error('[gbp/callback] token exchange failed:', e);
    return NextResponse.redirect(new URL(`${next}?gbp_error=token_exchange`, origin));
  }

  // Google only issues a refresh_token on the first grant (prompt=consent forces it).
  // If absent, check if we already have an active connection and treat as success.
  const db = createAdminClient();

  if (!tokens.refresh_token) {
    const { data: existing } = await db
      .from('gbp_connections')
      .select('id')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.redirect(new URL(next, origin));
    }
    return NextResponse.redirect(new URL(`${next}?gbp_error=no_refresh_token`, origin));
  }

  const accessToken     = tokens.access_token!;
  const encryptedRefresh = encryptToken(tokens.refresh_token);

  // List GBP accounts and locations, create one connection row per location
  let accounts: Awaited<ReturnType<typeof listAccounts>>;
  try {
    accounts = await listAccounts(accessToken);
  } catch (e) {
    console.error('[gbp/callback] listAccounts failed:', e);
    return NextResponse.redirect(new URL(`${next}?gbp_error=accounts_fetch`, origin));
  }

  for (const account of accounts) {
    const googleAccountId = account.name.split('/').pop()!; // "accounts/123" → "123"

    let locations: Awaited<ReturnType<typeof listLocations>>;
    try {
      locations = await listLocations(account.name, accessToken);
    } catch (e) {
      console.error(`[gbp/callback] listLocations failed for ${account.name}:`, e);
      continue; // skip this account, try others
    }

    for (const location of locations) {
      const locationId = location.name.split('/').pop()!; // "locations/456" → "456"

      const { error: upsertErr } = await db.from('gbp_connections').upsert(
        {
          business_id:       businessId,
          google_account_id: googleAccountId,
          location_id:       locationId,
          refresh_token:     encryptedRefresh,
          status:            'active',
        },
        { onConflict: 'business_id,location_id' },
      );

      if (upsertErr) {
        console.error('[gbp/callback] connection upsert failed:', upsertErr);
      }
    }
  }

  // Initialize reply_settings if this business doesn't have one yet
  await db.from('reply_settings').upsert(
    { business_id: businessId },
    { onConflict: 'business_id', ignoreDuplicates: true },
  );

  return NextResponse.redirect(new URL(next, origin));
}
