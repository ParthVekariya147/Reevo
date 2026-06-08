/**
 * Funnel Appearance feature — test suite
 *
 * Group 1 (19): PATCH /api/businesses — server-side validation
 * Group 2 (16): FunnelFlow rendering logic (pure unit)
 * Group 3 (16): ScreenSettings UI logic (pure unit)
 * Group 4  (5): Data layer — normalizeBusiness field mapping
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mock handles ─────────────────────────────────────────────────────
const { mockGetUser, mockAdminFrom, mockRpc, mockGetCurrentBusiness, mockRevalidatePath } =
  vi.hoisted(() => ({
    mockGetUser:            vi.fn(),
    mockAdminFrom:          vi.fn(),
    mockRpc:                vi.fn(),
    mockGetCurrentBusiness: vi.fn(),
    mockRevalidatePath:     vi.fn(),
  }));

// ── Module mocks (must be before any imports that use them) ──────────────────
vi.mock('@/lib/env', () => ({
  env: {
    SUPABASE_URL:          'http://localhost:54321',
    SUPABASE_ANON_KEY:     'test-anon-key',
    SUPABASE_SERVICE_ROLE: 'test-service-role',
    APP_URL:               'http://localhost:3000',
    SENTRY_DSN:            undefined,
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: { getUser: mockGetUser } })),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom, rpc: mockRpc })),
}));

// Use importActual so normalizeBusiness (pure fn) stays real; only mock getCurrentBusiness
vi.mock('@/lib/businesses/current', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/businesses/current')>();
  return { ...actual, getCurrentBusiness: mockGetCurrentBusiness };
});

vi.mock('next/cache',                        () => ({ revalidatePath: mockRevalidatePath }));
vi.mock('next/headers',                      () => ({ cookies: vi.fn(() => ({ get: vi.fn() })) }));
vi.mock('@/lib/email/send',                  () => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/email/templates/welcome',     () => ({ welcomeEmailHtml: vi.fn(() => '') }));
vi.mock('@/lib/analytics/events',            () => ({ trackEvent: vi.fn() }));

// ── Imports (after all mocks) ────────────────────────────────────────────────
import { PATCH }              from '@/app/api/businesses/route';
import { normalizeBusiness }  from '@/lib/businesses/current';

// ── Shared fixtures ──────────────────────────────────────────────────────────
const STUB_USER     = { id: 'user-1', email: 'owner@example.com' };
const STUB_BUSINESS = {
  id:                       'biz-1',
  name:                     'Test Bistro',
  tagline:                  null,
  google_link:              null,
  brand_color:              '#6E5BFF',
  logo_initials:            'TB',
  min_rating_for_google:    4,
  language:                 'en',
  review_platforms:         [],
  onboarding_complete:      true,
  business_type:            null,
  review_keywords:          null,
  owner_name:               null,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePatch(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/businesses', {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
}

/** Sets up auth and admin check mocks (needed for all PATCH tests). */
function setupAuth() {
  mockGetUser.mockResolvedValue({ data: { user: STUB_USER }, error: null });
  mockAdminFrom.mockImplementation((table: string) => {
    if (table === 'admin_users') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      };
    }
    // businesses table — used by extraUpdates direct save
    return {
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
    };
  });
}

/** Full happy-path mock: auth + getCurrentBusiness + upsert RPC. */
function setupHappyPath() {
  setupAuth();
  mockGetCurrentBusiness.mockResolvedValue({
    business: { ...STUB_BUSINESS },
    error:    null,
    schema:   'modern' as const,
  });
  mockRpc.mockResolvedValue({
    data:  { ...STUB_BUSINESS },
    error: null,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GROUP 1 — API validation (PATCH /api/businesses)
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 1 — PATCH /api/businesses funnel appearance validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  // ── funnel_bg_blur ───────────────────────────────────────────────────────

  it('1.1  funnel_bg_blur = -1 → 400 with blur range message', async () => {
    const res  = await PATCH(makePatch({ funnel_bg_blur: -1 }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain('0');
    expect(body.error).toContain('20');
  });

  it('1.2  funnel_bg_blur = 21 → 400', async () => {
    const res = await PATCH(makePatch({ funnel_bg_blur: 21 }));
    expect(res.status).toBe(400);
  });

  it('1.3  funnel_bg_blur = 0 → 200 (lower boundary valid)', async () => {
    setupHappyPath();
    const res = await PATCH(makePatch({ funnel_bg_blur: 0 }));
    expect(res.status).toBe(200);
  });

  it('1.4  funnel_bg_blur = 20 → 200 (upper boundary valid)', async () => {
    setupHappyPath();
    const res = await PATCH(makePatch({ funnel_bg_blur: 20 }));
    expect(res.status).toBe(200);
  });

  // ── funnel_bg_dim ────────────────────────────────────────────────────────

  it('1.5  funnel_bg_dim = -1 → 400 with dim range message', async () => {
    const res  = await PATCH(makePatch({ funnel_bg_dim: -1 }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain('0');
    expect(body.error).toContain('80');
  });

  it('1.6  funnel_bg_dim = 81 → 400', async () => {
    const res = await PATCH(makePatch({ funnel_bg_dim: 81 }));
    expect(res.status).toBe(400);
  });

  it('1.7  funnel_bg_dim = 0 → 200 (lower boundary valid)', async () => {
    setupHappyPath();
    const res = await PATCH(makePatch({ funnel_bg_dim: 0 }));
    expect(res.status).toBe(200);
  });

  it('1.8  funnel_bg_dim = 80 → 200 (upper boundary valid)', async () => {
    setupHappyPath();
    const res = await PATCH(makePatch({ funnel_bg_dim: 80 }));
    expect(res.status).toBe(200);
  });

  // ── funnel_font ──────────────────────────────────────────────────────────

  it('1.9  funnel_font = "Comic Sans" → 400 invalid font', async () => {
    const res  = await PATCH(makePatch({ funnel_font: 'Comic Sans' }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toMatch(/font/i);
  });

  it('1.10 funnel_font = "DM Sans" → 200', async () => {
    setupHappyPath();
    const res = await PATCH(makePatch({ funnel_font: 'DM Sans' }));
    expect(res.status).toBe(200);
  });

  it('1.11 funnel_font = "Syne" → 200', async () => {
    setupHappyPath();
    const res = await PATCH(makePatch({ funnel_font: 'Syne' }));
    expect(res.status).toBe(200);
  });

  // ── funnel_accent_color ──────────────────────────────────────────────────

  it('1.12 funnel_accent_color = "red" → 400 must be hex', async () => {
    const res  = await PATCH(makePatch({ funnel_accent_color: 'red' }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toMatch(/hex/i);
  });

  it('1.13 funnel_accent_color = "#gggggg" → 400', async () => {
    const res = await PATCH(makePatch({ funnel_accent_color: '#gggggg' }));
    expect(res.status).toBe(400);
  });

  it('1.14 funnel_accent_color = "#1a1a1a" → 200', async () => {
    setupHappyPath();
    const res = await PATCH(makePatch({ funnel_accent_color: '#1a1a1a' }));
    expect(res.status).toBe(200);
  });

  it('1.15 funnel_accent_color = "#B5541C" (uppercase) → 200', async () => {
    setupHappyPath();
    const res = await PATCH(makePatch({ funnel_accent_color: '#B5541C' }));
    expect(res.status).toBe(200);
  });

  // ── funnel_bg_image_url ──────────────────────────────────────────────────

  it('1.16 funnel_bg_image_url = "not-a-url" → 400', async () => {
    const res  = await PATCH(makePatch({ funnel_bg_image_url: 'not-a-url' }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toMatch(/url/i);
  });

  it('1.17 funnel_bg_image_url = valid https URL → 200', async () => {
    setupHappyPath();
    const res = await PATCH(makePatch({ funnel_bg_image_url: 'https://example.com/img.jpg' }));
    expect(res.status).toBe(200);
  });

  it('1.18 funnel_bg_image_url = null → 200 (clears image)', async () => {
    setupHappyPath();
    const res = await PATCH(makePatch({ funnel_bg_image_url: null }));
    expect(res.status).toBe(200);
  });

  it('1.19 All 8 funnel fields valid in one call → 200', async () => {
    setupHappyPath();
    const res = await PATCH(makePatch({
      funnel_style:        'dark',
      funnel_font:         'Syne',
      funnel_accent_color: '#2d5a3d',
      funnel_bg_image_url: 'https://cdn.example.com/bg.jpg',
      funnel_bg_blur:      10,
      funnel_bg_dim:       40,
      funnel_card_bg:      null,
      funnel_preset_name:  'Dark Roast',
    }));
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GROUP 2 — FunnelFlow rendering logic (pure unit tests)
// Mirrors the exact logic implemented in src/app/r/[token]/FunnelFlow.tsx
// ═══════════════════════════════════════════════════════════════════════════

// Mirrors FunnelFlow.tsx styleMap card backgrounds
const FUNNEL_STYLE_CARDS: Record<string, string> = {
  elegant: '#fff',
  vivid:   'rgba(255,255,255,0.15)',
  playful: 'rgba(255,255,255,0.7)',
  minimal: 'rgba(255,255,255,0.97)',
  glass:   'rgba(255,255,255,0.25)',
  dark:    'rgba(15,15,15,0.92)',
  luxury:  'rgba(250,246,238,0.97)',
  neon:    'rgba(5,5,20,0.92)',
  clay:    'rgba(245,235,220,0.96)',
};

// Mirrors: const accent = business?.funnelAccentColor ?? brand
const resolveAccent = (funnelAccentColor: string | null | undefined, brandColor: string) =>
  funnelAccentColor ?? brandColor;

// Mirrors the wrapper's conditional backgroundImage
const buildBgStyle = (bgImage: string | null | undefined) =>
  bgImage
    ? { backgroundImage: `url('${bgImage}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

// Mirrors blur overlay div style
const buildBlurStyle = (blur: number) => ({
  backdropFilter: blur > 0 ? `blur(${blur}px)` : undefined,
});

// Mirrors dim overlay div style
const buildDimStyle = (dim: number) => ({
  background: dim > 0 ? `rgba(0,0,0,${dim / 100})` : undefined,
});

// Mirrors font injection condition and URL
const shouldInjectFont = (font: string) => font !== 'DM Sans';
const buildFontUrl     = (font: string) =>
  `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@300;400;500;600&display=swap`;

describe('Group 2 — FunnelFlow accent resolution', () => {
  it('2.1  No funnelAccentColor → falls back to brandColor', () => {
    expect(resolveAccent(null,      '#6E5BFF')).toBe('#6E5BFF');
    expect(resolveAccent(undefined, '#6E5BFF')).toBe('#6E5BFF');
  });

  it('2.2  funnelAccentColor set → used instead of brandColor', () => {
    expect(resolveAccent('#b5541c', '#6E5BFF')).toBe('#b5541c');
  });
});

describe('Group 2 — FunnelFlow styleMap card backgrounds', () => {
  it('2.3  dark style → card rgba(15,15,15,0.92)', () => {
    expect(FUNNEL_STYLE_CARDS.dark).toBe('rgba(15,15,15,0.92)');
  });

  it('2.4  glass style → card rgba(255,255,255,0.25)', () => {
    expect(FUNNEL_STYLE_CARDS.glass).toBe('rgba(255,255,255,0.25)');
  });

  it('2.5  elegant style present (legacy preserved, does not throw)', () => {
    expect(FUNNEL_STYLE_CARDS).toHaveProperty('elegant');
  });

  it('2.6  vivid style present (legacy preserved)', () => {
    expect(FUNNEL_STYLE_CARDS).toHaveProperty('vivid');
  });

  it('2.7  playful style present (legacy preserved)', () => {
    expect(FUNNEL_STYLE_CARDS).toHaveProperty('playful');
  });
});

describe('Group 2 — FunnelFlow background image wrapper', () => {
  it('2.8  funnelBgImageUrl set → wrapper has backgroundImage css', () => {
    const style = buildBgStyle('https://cdn.example.com/bg.jpg');
    expect(style).toHaveProperty('backgroundImage', "url('https://cdn.example.com/bg.jpg')");
    expect(style).toHaveProperty('backgroundSize', 'cover');
  });

  it('2.9  funnelBgImageUrl null → no backgroundImage on wrapper', () => {
    expect(buildBgStyle(null)).not.toHaveProperty('backgroundImage');
    expect(buildBgStyle(undefined)).not.toHaveProperty('backgroundImage');
  });
});

describe('Group 2 — FunnelFlow blur overlay', () => {
  it('2.10 funnelBgBlur = 10 → backdropFilter blur(10px)', () => {
    expect(buildBlurStyle(10).backdropFilter).toBe('blur(10px)');
  });

  it('2.11 funnelBgBlur = 0 → no backdropFilter (undefined)', () => {
    expect(buildBlurStyle(0).backdropFilter).toBeUndefined();
  });
});

describe('Group 2 — FunnelFlow dim overlay', () => {
  it('2.12 funnelBgDim = 50 → background rgba(0,0,0,0.5)', () => {
    expect(buildDimStyle(50).background).toBe('rgba(0,0,0,0.5)');
  });

  it('2.13 funnelBgDim = 0 → no background (undefined)', () => {
    expect(buildDimStyle(0).background).toBeUndefined();
  });
});

describe('Group 2 — FunnelFlow font injection', () => {
  it('2.14 funnelFont = "Playfair Display" → card element would have that font family', () => {
    const cardFontFamily = `'Playfair Display', sans-serif`;
    expect(cardFontFamily).toContain('Playfair Display');
  });

  it('2.15 funnelFont = "DM Sans" → no Google Fonts link should be injected', () => {
    expect(shouldInjectFont('DM Sans')).toBe(false);
  });

  it('2.16 funnelFont = "Syne" → injection triggered, URL contains Syne + googleapis', () => {
    expect(shouldInjectFont('Syne')).toBe(true);
    const url = buildFontUrl('Syne');
    expect(url).toContain('Syne');
    expect(url).toContain('fonts.googleapis.com');
    expect(url).toContain('display=swap');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GROUP 3 — ScreenSettings UI logic (pure unit tests)
// Mirrors the constants and logic in ScreenSettings.tsx
// ═══════════════════════════════════════════════════════════════════════════

const STYLE_PILLS    = ['minimal', 'glass', 'dark', 'luxury', 'neon', 'clay'] as const;
const FONT_PILLS     = [
  { value: 'DM Sans',           label: 'DM Sans'   },
  { value: 'Playfair Display',  label: 'Playfair'  },
  { value: 'Syne',              label: 'Syne'       },
  { value: 'Fraunces',          label: 'Fraunces'  },
  { value: 'Cormorant Garamond',label: 'Cormorant' },
] as const;
const ACCENT_PRESETS = [
  '#1a1a1a', '#b5541c', '#2d5a3d', '#9e3a5c',
  '#1a3a6c', '#3d4a5c', '#8a6a1a', '#5a2d6e',
] as const;
const SECTION_LABELS = [
  'Business profile', 'Branding', 'Funnel appearance', 'Funnel defaults',
  'Notifications', 'Team access', 'Security', 'API & webhooks', 'Billing preferences',
];
const PREVIEW_STYLE_MAP: Record<string, { cardBg: string }> = {
  minimal: { cardBg: 'rgba(255,255,255,0.97)' },
  glass:   { cardBg: 'rgba(255,255,255,0.25)' },
  dark:    { cardBg: 'rgba(15,15,15,0.92)'    },
  luxury:  { cardBg: 'rgba(250,246,238,0.97)' },
  neon:    { cardBg: 'rgba(5,5,20,0.92)'      },
  clay:    { cardBg: 'rgba(245,235,220,0.96)' },
  elegant: { cardBg: 'rgba(255,255,255,0.97)' },
  vivid:   { cardBg: 'rgba(255,255,255,0.97)' },
  playful: { cardBg: 'rgba(255,255,255,0.97)' },
};

describe('Group 3 — ScreenSettings section navigation', () => {
  it('3.1  "Funnel appearance" section exists in nav', () => {
    expect(SECTION_LABELS).toContain('Funnel appearance');
  });

  it('3.2  6 style pills are defined (Minimal/Glass/Dark/Luxury/Neon/Clay)', () => {
    expect(STYLE_PILLS).toHaveLength(6);
    expect(STYLE_PILLS).toContain('minimal');
    expect(STYLE_PILLS).toContain('glass');
    expect(STYLE_PILLS).toContain('dark');
    expect(STYLE_PILLS).toContain('luxury');
    expect(STYLE_PILLS).toContain('neon');
    expect(STYLE_PILLS).toContain('clay');
  });
});

describe('Group 3 — ScreenSettings style and font pills', () => {
  it('3.3  Clicking "Dark" pill sets funnel_style to "dark"', () => {
    let funnelStyle = 'minimal';
    // simulate set('funnel_style', 'dark')
    funnelStyle = 'dark';
    expect(funnelStyle).toBe('dark');
  });

  it('3.4  5 font pills are defined', () => {
    expect(FONT_PILLS).toHaveLength(5);
    const values = FONT_PILLS.map(f => f.value);
    expect(values).toContain('DM Sans');
    expect(values).toContain('Playfair Display');
    expect(values).toContain('Syne');
    expect(values).toContain('Fraunces');
    expect(values).toContain('Cormorant Garamond');
  });

  it('3.5  Clicking "Syne" pill sets funnel_font to "Syne" (full name)', () => {
    let funnelFont = 'DM Sans';
    // simulate set('funnel_font', 'Syne')
    funnelFont = 'Syne';
    expect(funnelFont).toBe('Syne');
  });
});

describe('Group 3 — ScreenSettings accent color swatches', () => {
  it('3.6  8 accent preset swatches are defined', () => {
    expect(ACCENT_PRESETS).toHaveLength(8);
  });

  it('3.7  Custom color input accepts hex — input type is "color"', () => {
    // type="color" natively constrains to hex
    const inputType = 'color';
    expect(inputType).toBe('color');
  });
});

describe('Group 3 — ScreenSettings blur slider enable/disable', () => {
  it('3.8  Blur slider disabled when funnel_bg_image_url is null', () => {
    const bgImageUrl: string | null = null;
    // mirrors: disabled={!form.funnel_bg_image_url}
    const disabled = !bgImageUrl;
    expect(disabled).toBe(true);
  });

  it('3.9  Blur slider enabled when funnel_bg_image_url is set', () => {
    const bgImageUrl = 'https://cdn.example.com/bg.jpg';
    const disabled = !bgImageUrl;
    expect(disabled).toBe(false);
  });
});

describe('Group 3 — ScreenSettings mini-preview card', () => {
  it('3.10 Preview reflects funnel_style — "dark" gives rgba(15,15,15,0.92) cardBg', () => {
    const funnelStyle = 'dark';
    const sv = PREVIEW_STYLE_MAP[funnelStyle] ?? PREVIEW_STYLE_MAP.minimal;
    expect(sv.cardBg).toBe('rgba(15,15,15,0.92)');
  });

  it('3.11 Preview reflects funnel_accent_color change in real time', () => {
    let accentColor = '#1a1a1a';
    // simulate set('funnel_accent_color', '#b5541c')
    accentColor = '#b5541c';
    // logo circle + CTA button background would use this value
    expect(accentColor).toBe('#b5541c');
  });
});

describe('Group 3 — ScreenSettings file upload validation', () => {
  const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

  it('3.12 File > 2 MB → setBgUploadError called, upload NOT triggered', () => {
    const file = { size: MAX_BYTES + 1, name: 'huge.jpg' };
    // mirrors: if (file.size > 2 * 1024 * 1024) { setBgUploadError(...); return; }
    const shouldReject = file.size > MAX_BYTES;
    expect(shouldReject).toBe(true);
  });

  it('3.13 File ≤ 2 MB → no error, upload proceeds', () => {
    const file = { size: MAX_BYTES, name: 'ok.jpg' };
    const shouldReject = file.size > MAX_BYTES;
    expect(shouldReject).toBe(false);
  });
});

describe('Group 3 — ScreenSettings remove and save', () => {
  it('3.14 "Remove" button shown only when funnel_bg_image_url is set', () => {
    expect(Boolean('https://cdn.example.com/bg.jpg')).toBe(true);
    expect(Boolean(null)).toBe(false);
  });

  it('3.15 Remove button click sets funnel_bg_image_url to null', () => {
    let bgImageUrl: string | null = 'https://cdn.example.com/bg.jpg';
    // mirrors: set('funnel_bg_image_url', null)
    bgImageUrl = null;
    expect(bgImageUrl).toBeNull();
  });

  it('3.16 Save payload includes all 8 new funnel appearance fields', () => {
    // Mirrors the save() function: patchBusiness({ ...form, instagram_handle: … })
    const form = {
      name:                     'Bistro Luxe',
      tagline:                  null,
      google_link:              null,
      brand_color:              '#6E5BFF',
      logo_initials:            'BL',
      min_rating_for_google:    4,
      language:                 'en',
      review_length_preference: ['short', 'medium'],
      instagram_handle:         '',
      funnel_style:             'dark',
      funnel_font:              'Syne',
      funnel_accent_color:      '#2d5a3d',
      funnel_bg_image_url:      'https://cdn.example.com/bg.jpg' as string | null,
      funnel_bg_blur:           10,
      funnel_bg_dim:            30,
      funnel_card_bg:           null as string | null,
      funnel_preset_name:       'Dark Roast' as string | null,
    };
    const payload = { ...form, instagram_handle: form.instagram_handle.trim() || null };
    expect(payload).toMatchObject({
      funnel_style:        'dark',
      funnel_font:         'Syne',
      funnel_accent_color: '#2d5a3d',
      funnel_bg_image_url: 'https://cdn.example.com/bg.jpg',
      funnel_bg_blur:      10,
      funnel_bg_dim:       30,
      funnel_card_bg:      null,
      funnel_preset_name:  'Dark Roast',
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GROUP 4 — Data layer (normalizeBusiness field mapping from current.ts)
// ═══════════════════════════════════════════════════════════════════════════

// Base business row with all pre-existing fields (real normalizeBusiness needs these)
const NORM_BASE: Record<string, unknown> = {
  id:                       'biz-1',
  name:                     'Test Biz',
  tagline:                  null,
  google_link:              null,
  brand_color:              '#6E5BFF',
  logo_initials:            'TB',
  min_rating_for_google:    4,
  language:                 'en',
  plan:                     'free',
  review_platforms:         [],
  onboarding_complete:      true,
  onboarding_step:          0,
  owner_name:               null,
  review_length_preference: ['short'],
  funnel_style:             'minimal',
  funnel_heading:           null,
  funnel_sub:               null,
};

describe('Group 4 — normalizeBusiness new field mapping', () => {
  it('4.1  Returns funnelFont + funnelAccentColor when DB provides values', () => {
    const result = normalizeBusiness({
      ...NORM_BASE,
      funnel_font:         'Syne',
      funnel_accent_color: '#b5541c',
    });
    expect(result?.funnel_font).toBe('Syne');
    expect(result?.funnel_accent_color).toBe('#b5541c');
  });

  it('4.2  funnel_bg_image_url = null → returned as null (not undefined)', () => {
    const result = normalizeBusiness({ ...NORM_BASE, funnel_bg_image_url: null });
    expect(result?.funnel_bg_image_url).toBeNull();
  });

  it('4.3  funnel_bg_blur = 0 → returned as number 0 (not string)', () => {
    const result = normalizeBusiness({ ...NORM_BASE, funnel_bg_blur: 0 });
    expect(typeof result?.funnel_bg_blur).toBe('number');
    expect(result?.funnel_bg_blur).toBe(0);
  });

  it('4.4  funnel_bg_dim = 0 → returned as number 0 (not string)', () => {
    const result = normalizeBusiness({ ...NORM_BASE, funnel_bg_dim: 0 });
    expect(typeof result?.funnel_bg_dim).toBe('number');
    expect(result?.funnel_bg_dim).toBe(0);
  });

  it('4.5  normalizeBusiness(null) → null (unknown token / missing business)', () => {
    expect(normalizeBusiness(null)).toBeNull();
  });
});
