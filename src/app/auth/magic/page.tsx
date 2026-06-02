'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Handles the implicit-flow magic link from admin impersonation.
// Supabase delivers tokens via URL hash (#access_token=...&refresh_token=...),
// which is invisible to server routes — so we must read and exchange it client-side.
export default function MagicCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const accessToken  = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      router.replace('/login?error=magic_link_failed');
      return;
    }

    createClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) router.replace('/login?error=magic_link_failed');
        else router.replace('/app/business_dashboard');
      });
  }, [router]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: '#6b7280',
    }}>
      Signing you in…
    </div>
  );
}
