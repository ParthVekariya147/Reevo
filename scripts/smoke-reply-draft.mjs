#!/usr/bin/env node
/**
 * Reevo — Draft Mode smoke test
 *
 * Required env:
 *   SMOKE_COOKIE        Logged-in owner session (full Cookie header string).
 *                       From browser: DevTools → Application → Cookies → copy all as
 *                       "sb-<project>-auth-token=..." etc.
 *
 * Optional env:
 *   SMOKE_ADMIN_COOKIE  Admin session cookie — required only for step 6 (limit test).
 *                       If absent, step 6 is skipped with a warning.
 *   SMOKE_BASE          Dev server URL (default: http://localhost:3000).
 *
 * .env.local is loaded automatically for Supabase vars.
 *
 * Usage:
 *   SMOKE_COOKIE="sb-..." node scripts/smoke-reply-draft.mjs
 *   SMOKE_COOKIE="sb-..." SMOKE_ADMIN_COOKIE="sb-..." node scripts/smoke-reply-draft.mjs
 */

import { readFileSync } from 'fs';

// ── Load .env.local ────────────────────────────────────────────
try {
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
} catch { /* rely on real process.env */ }

// ── Config ─────────────────────────────────────────────────────
const BASE         = (process.env.SMOKE_BASE ?? 'http://localhost:3000').replace(/\/$/, '');
const COOKIE       = process.env.SMOKE_COOKIE ?? '';
const ADMIN_COOKIE = process.env.SMOKE_ADMIN_COOKIE ?? '';
const SB_URL       = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
const SB_SVC       = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// ── State ─────────────────────────────────────────────────────
let passed = 0; let failed = 0; let skipped = 0;

// ── Reporters ──────────────────────────────────────────────────
function pass(id, msg) { console.log(`  ✅ PASS  [${id}] ${msg}`); passed++; }
function fail(id, msg) { console.log(`  ❌ FAIL  [${id}] ${msg}`); failed++; }
function skip(id, msg) { console.log(`  ⏭  SKIP  [${id}] ${msg}`); skipped++; }
function info(msg)      { console.log(`     ℹ  ${msg}`); }

// ── HTTP: Next.js API routes (via Cookie) ─────────────────────
async function api(path, { method = 'GET', body = undefined, cookie = COOKIE } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try { json = await res.json(); } catch { /* empty/non-json */ }
  return { status: res.status, ok: res.ok, json };
}

// ── HTTP: Supabase PostgREST (service-role, no ws needed) ──────
async function sb(table, select, filter = '') {
  const url = `${SB_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}${filter ? '&' + filter : ''}`;
  const res  = await fetch(url, {
    headers: { apikey: SB_SVC, Authorization: `Bearer ${SB_SVC}` },
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, ok: res.ok, data };
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Reevo — AI Reply Draft Mode  smoke test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ── Guard: config ──────────────────────────────────────────
  if (!SB_URL || !SB_SVC) {
    console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    console.error('    Ensure .env.local is present in the project root.\n');
    process.exit(1);
  }
  if (!COOKIE) {
    console.error('❌  SMOKE_COOKIE is not set.\n');
    console.error('    How to get it:');
    console.error('    1.  npm run dev');
    console.error('    2.  Log in at http://localhost:3000/login');
    console.error('    3.  DevTools → Network → any /api call → Request Headers → Cookie');
    console.error('    4.  Copy the full value and export:');
    console.error('        SMOKE_COOKIE="sb-..." node scripts/smoke-reply-draft.mjs\n');
    process.exit(1);
  }

  // ══════════════════════════════════════════════════════════════
  // PRECHECK — migration 039 columns
  // ══════════════════════════════════════════════════════════════
  console.log('── PRECHECK: migration 039 ─────────────────────────────\n');

  const [c1, c2, c3] = await Promise.all([
    sb('reply_settings',       'reply_length',              'limit=1'),
    sb('businesses',           'reply_draft_limit_override','limit=1'),
    sb('review_reply_drafts',  'id',                        'limit=1'),
  ]);
  const { data: settingRow } = await sb('admin_settings', 'key,value', 'key=eq.free_reply_draft_limit');

  const col1ok = c1.ok && !String(c1.data).includes('"code":"42703"');
  const col2ok = c2.ok && !String(c2.data).includes('"code":"42703"');
  const col3ok = c3.ok;
  const seedok = Array.isArray(settingRow) && settingRow.length > 0;

  if (!col1ok || !col2ok || !col3ok) {
    console.error('  ❌  Migration 039 has NOT been applied. Missing:');
    if (!col1ok) console.error('      • reply_settings.reply_length');
    if (!col2ok) console.error('      • businesses.reply_draft_limit_override');
    if (!col3ok) console.error('      • review_reply_drafts table');
    console.error('\n  ➜  Run database/039_review_reply_drafts.sql in your Supabase SQL editor first.\n');
    process.exit(1);
  }
  info('reply_settings.reply_length ✓');
  info('businesses.reply_draft_limit_override ✓');
  info('review_reply_drafts table ✓');
  info(`admin_settings.free_reply_draft_limit = ${seedok ? settingRow[0].value : '❌ MISSING (run migration)'}`);
  if (!seedok) {
    console.error('\n  ❌  admin_settings seed row missing. Re-run migration 039.\n');
    process.exit(1);
  }
  console.log();

  // ── Resolve owner business ─────────────────────────────────
  console.log('── Resolving owner business ────────────────────────────\n');
  const bizRes = await api('/api/businesses');
  if (!bizRes.ok || !bizRes.json?.business?.id) {
    console.error(`  ❌  Cannot load business from SMOKE_COOKIE session (HTTP ${bizRes.status}).`);
    console.error('      The cookie may be expired or belong to a non-owner user.\n');
    process.exit(1);
  }
  const BIZ_ID   = bizRes.json.business.id;
  const BIZ_PLAN = bizRes.json.business.plan ?? 'free';
  info(`business_id : ${BIZ_ID}`);
  info(`plan        : ${BIZ_PLAN}`);
  console.log();

  // ══════════════════════════════════════════════════════════════
  // Step 1 — GET reply-settings
  // ══════════════════════════════════════════════════════════════
  console.log('── Step 1: GET /api/reviews/reply-settings ─────────────\n');
  {
    const r = await api('/api/reviews/reply-settings');
    if (!r.ok) {
      fail(1, `HTTP ${r.status} — ${JSON.stringify(r.json)}`);
    } else if (!r.json?.settings) {
      fail(1, `Missing "settings" key: ${JSON.stringify(r.json)}`);
    } else {
      const s = r.json.settings;
      info(`tone=${s.tone}  reply_length=${s.reply_length}  language=${s.language ?? 'null'}`);
      pass(1, 'GET reply-settings returned valid settings object');
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Step 2 — PATCH reply-settings → GET confirms
  // ══════════════════════════════════════════════════════════════
  console.log('\n── Step 2: PATCH reply-settings → confirm with GET ─────\n');
  {
    const p = await api('/api/reviews/reply-settings', {
      method: 'PATCH',
      body:   { tone: 'professional', reply_length: 'short' },
    });
    if (!p.ok) {
      fail('2a', `PATCH failed HTTP ${p.status} — ${JSON.stringify(p.json)}`);
    } else {
      pass('2a', 'PATCH → ok:true');
      const g = await api('/api/reviews/reply-settings');
      if (!g.ok) {
        fail('2b', `GET failed HTTP ${g.status}`);
      } else if (g.json?.settings?.tone !== 'professional' || g.json?.settings?.reply_length !== 'short') {
        fail('2b', `Expected tone=professional reply_length=short, got: ${JSON.stringify(g.json?.settings)}`);
      } else {
        pass('2b', 'GET confirms tone=professional  reply_length=short');
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Step 3 — POST reply-draft (5★)
  // ══════════════════════════════════════════════════════════════
  console.log('\n── Step 3: POST reply-draft (5★ positive review) ───────\n');
  let draft5Id = null;
  {
    const r = await api('/api/reviews/reply-draft', {
      method: 'POST',
      body: {
        reviewText:   'Absolutely amazing experience! The staff were so helpful and everything exceeded my expectations. Will definitely come back.',
        rating:       5,
        reviewerName: 'Alex T.',
      },
    });
    if (r.status === 429 && r.json?.remaining === 0) {
      fail(3, 'Monthly limit already at 0 — reset drafts or use a paid account for this test');
    } else if (!r.ok) {
      fail(3, `HTTP ${r.status} — ${JSON.stringify(r.json)}`);
    } else if (!r.json?.reply?.trim()) {
      fail(3, 'reply field is empty');
    } else {
      draft5Id = r.json.draftId ?? null;
      info(`draftId   : ${draft5Id}`);
      info(`remaining : ${r.json.remaining ?? 'unlimited (paid)'}`);
      info(`reply     : "${r.json.reply.slice(0, 140)}${r.json.reply.length > 140 ? '…' : ''}"`);
      pass(3, '5★ reply generated and saved to DB');
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Step 4 — POST reply-draft (1★ — eyeball for empathy)
  // ══════════════════════════════════════════════════════════════
  console.log('\n── Step 4: POST reply-draft (1★ — eyeball empathy) ─────\n');
  {
    const r = await api('/api/reviews/reply-draft', {
      method: 'POST',
      body: {
        reviewText:   'Terrible experience. Waited 40 minutes, staff were rude, food was cold. Complete disaster. Never coming back.',
        rating:       1,
        reviewerName: 'Unhappy Customer',
      },
    });
    if (r.status === 429 && r.json?.remaining === 0) {
      fail(4, 'Limit hit — cannot test 1★ reply');
    } else if (!r.ok) {
      fail(4, `HTTP ${r.status} — ${JSON.stringify(r.json)}`);
    } else if (!r.json?.reply?.trim()) {
      fail(4, '1★ reply is empty');
    } else {
      console.log('     1★ reply (verify: empathetic, apologetic, no defensiveness):');
      console.log('     ┌────────────────────────────────────────────────────────────┐');
      const words = r.json.reply.replace(/\n/g, ' ');
      const chunks = words.match(/.{1,62}/g) ?? [words];
      for (const c of chunks) console.log(`     │ ${c.padEnd(62)} │`);
      console.log('     └────────────────────────────────────────────────────────────┘\n');
      pass(4, '1★ reply returned non-empty (read box above)');
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Step 5 — PATCH copied:true → verify copied_at in DB
  // ══════════════════════════════════════════════════════════════
  console.log('\n── Step 5: PATCH { draftId, copied:true } → DB verify ──\n');
  if (!draft5Id) {
    skip(5, 'No draftId from step 3 — skipping');
  } else {
    const r = await api('/api/reviews/reply-draft', {
      method: 'PATCH',
      body:   { draftId: draft5Id, copied: true },
    });
    if (!r.ok) {
      fail('5a', `HTTP ${r.status} — ${JSON.stringify(r.json)}`);
    } else {
      pass('5a', 'PATCH returned ok:true');
      // Verify via PostgREST (no WebSocket needed)
      const { data, ok } = await sb(
        'review_reply_drafts',
        'copied_at',
        `id=eq.${draft5Id}`,
      );
      if (!ok || !Array.isArray(data) || data.length === 0) {
        fail('5b', 'Row not found in DB');
      } else if (!data[0].copied_at) {
        fail('5b', 'copied_at is still NULL in DB');
      } else {
        info(`copied_at = ${data[0].copied_at}`);
        pass('5b', 'copied_at set in DB ✓');
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Step 6 — Limit enforcement: admin override=2, generate 3, reset
  // ══════════════════════════════════════════════════════════════
  console.log('\n── Step 6: Limit enforcement (admin override → 429) ────\n');

  if (!ADMIN_COOKIE) {
    skip('6a', 'SMOKE_ADMIN_COOKIE not set');
    skip('6b', 'depends on 6a');
    skip('6c', 'depends on 6a');
    console.log();
    console.log('     To run step 6:');
    console.log('     1. Log in as an admin user at /admin/login');
    console.log('     2. Copy Cookie header from any /api/admin/* request');
    console.log('     3. Re-run with SMOKE_ADMIN_COOKIE="..." set\n');
  } else {
    // 6a: set override=2
    const setRes = await api(`/api/admin/businesses/${BIZ_ID}`, {
      method: 'PATCH',
      cookie: ADMIN_COOKIE,
      body:   { reply_draft_limit_override: 2 },
    });
    if (!setRes.ok) {
      fail('6a', `Admin PATCH override=2: HTTP ${setRes.status} — ${JSON.stringify(setRes.json)}`);
      skip('6b', 'depends on 6a');
      skip('6c', 'depends on 6a');
    } else {
      pass('6a', 'Admin set reply_draft_limit_override = 2');

      // Count existing drafts this calendar month
      const som = new Date(
        Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)
      ).toISOString();

      // Use PostgREST HEAD request to get count
      const countRes = await fetch(
        `${SB_URL}/rest/v1/review_reply_drafts?business_id=eq.${BIZ_ID}&created_at=gte.${encodeURIComponent(som)}&select=id`,
        {
          method:  'HEAD',
          headers: {
            apikey:        SB_SVC,
            Authorization: `Bearer ${SB_SVC}`,
            Prefer:        'count=exact',
          },
        },
      );
      const existing = parseInt(countRes.headers.get('content-range')?.split('/')[1] ?? '0', 10) || 0;
      info(`existing drafts this month : ${existing}`);

      const toFill       = Math.max(0, 2 - existing);
      const totalAttempts = toFill + 1;
      info(`attempts planned           : ${totalAttempts} (${toFill} to fill + 1 over-limit)`);

      let step6bDone = false;
      for (let i = 0; i < totalAttempts; i++) {
        const r = await api('/api/reviews/reply-draft', {
          method: 'POST',
          body: { reviewText: `Limit smoke-test attempt ${i + 1}.`, rating: 3 },
        });
        const isOverLimit = i === totalAttempts - 1;
        if (isOverLimit) {
          if (r.status === 429 && r.json?.remaining === 0) {
            info(`429 message: "${r.json?.error}"`);
            pass('6b', '3rd call returns 429 + remaining=0');
            step6bDone = true;
          } else {
            fail('6b', `Expected 429+remaining=0, got HTTP ${r.status}: ${JSON.stringify(r.json)}`);
          }
        } else if (!r.ok && r.status !== 429) {
          fail('6b', `Unexpected error filling draft #${i + 1}: HTTP ${r.status}`);
          break;
        }
      }
      if (!step6bDone && !failed) {
        skip('6b', 'unexpected code path');
      }

      // 6c: reset to null
      const resetRes = await api(`/api/admin/businesses/${BIZ_ID}`, {
        method: 'PATCH',
        cookie: ADMIN_COOKIE,
        body:   { reply_draft_limit_override: null },
      });
      if (!resetRes.ok) {
        fail('6c', `Reset override failed: HTTP ${resetRes.status}`);
      } else {
        const { data } = await sb('businesses', 'reply_draft_limit_override', `id=eq.${BIZ_ID}`);
        const val = Array.isArray(data) && data.length > 0 ? data[0].reply_draft_limit_override : 'row-not-found';
        if (val !== null && val !== undefined) {
          fail('6c', `override still ${val} in DB after reset`);
        } else {
          pass('6c', 'Override reset to null — global limit restored');
        }
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Summary
  // ══════════════════════════════════════════════════════════════
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Results :  ${passed} passed  |  ${failed} failed  |  ${skipped} skipped`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('\n❌  Unhandled error:', err?.message ?? String(err));
  process.exit(1);
});
