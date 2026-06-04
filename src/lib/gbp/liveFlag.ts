import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Returns true when the GBP Live API flag is enabled in admin_settings.
 * Defaults to false on any DB error or missing row — safe to call from cron/route handlers.
 */
export async function isGbpLive(): Promise<boolean> {
  try {
    const db = createAdminClient();
    const { data } = await db
      .from('admin_settings')
      .select('value')
      .eq('key', 'feature_flag_gbp_live')
      .maybeSingle();
    return (data as { value: string } | null)?.value === 'true';
  } catch {
    return false;
  }
}
