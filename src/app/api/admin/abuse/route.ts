import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AbuseEntry } from '@/types/admin';

type AbuseScanRow = {
  qr_id:         string;
  campaign_name: string;
  business_id:   string;
  business_name: string;
  scan_count:    number;
  copy_count:    number;
};

export async function GET() {
  const result = await requireAdmin();
  if ('error' in result) return result.error;

  const db = createAdminClient();
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const flags: AbuseEntry[] = [];

  // DB-side GROUP BY + threshold: returns only QR codes with > 100 scans,
  // with copy counts joined. Zero rows in → zero rows out, no JS aggregation.
  const { data: scanRows, error } = await db
    .rpc('admin_abuse_scan_summary', { since });

  if (error) {
    console.error('[admin/abuse GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!scanRows || scanRows.length === 0) {
    return NextResponse.json({ data: flags, total: 0 });
  }

  const now = new Date().toISOString();
  for (const qr of scanRows as AbuseScanRow[]) {
    const scanCount = Number(qr.scan_count);
    const copyCount = Number(qr.copy_count);
    const copyRate  = scanCount > 0 ? (copyCount / scanCount) * 100 : 0;

    if (scanCount > 100 && copyCount === 0) {
      flags.push({ business_id: qr.business_id, business_name: qr.business_name, qr_id: qr.qr_id, campaign_name: qr.campaign_name, flag_type: 'dead-funnel', scan_count: scanCount, copy_rate: 0, detected_at: now });
    }
    if (scanCount > 200 && copyRate < 20 && copyCount > 0) {
      flags.push({ business_id: qr.business_id, business_name: qr.business_name, qr_id: qr.qr_id, campaign_name: qr.campaign_name, flag_type: 'low-quality', scan_count: scanCount, copy_rate: parseFloat(copyRate.toFixed(1)), detected_at: now });
    }
    if (scanCount > 500 && !flags.some(f => f.qr_id === qr.qr_id && f.flag_type === 'bot')) {
      flags.push({ business_id: qr.business_id, business_name: qr.business_name, qr_id: qr.qr_id, campaign_name: qr.campaign_name, flag_type: 'bot', scan_count: scanCount, copy_rate: parseFloat(copyRate.toFixed(1)), detected_at: now });
    }
  }

  return NextResponse.json({ data: flags, total: flags.length });
}
