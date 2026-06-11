// Admin-specific TypeScript types
// All admin API responses and component props are typed here.

export type AdminRole = 'super_admin' | 'admin' | 'support';

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  created_at: string;
}

// ── Plan ────────────────────────────────────────────────────

export type Plan = 'free' | 'starter' | 'pro' | 'growth' | 'enterprise';
export type SubStatus = 'active' | 'canceled' | 'past_due' | 'trialing';
export type QRStatus = 'draft' | 'live' | 'paused';
export type InvoiceStatus = 'paid' | 'open' | 'void' | 'uncollectible';

// ── Business ─────────────────────────────────────────────────

export interface AdminBusiness {
  id: string;
  owner_id: string;
  owner_email: string;
  name: string;
  tagline: string | null;
  google_link: string | null;
  brand_color: string;
  logo_initials: string;
  plan: Plan;
  suspended_at: string | null;
  suspended_reason: string | null;
  created_at: string;
  updated_at: string;
  // computed joins
  qr_count: number;
  total_scans: number;
  subscription: AdminSubscription | null;
}

export interface AdminBusinessDetail extends AdminBusiness {
  qr_codes: AdminQRCode[];
  recent_audit_logs: AuditLog[];
}

// ── QR Code ──────────────────────────────────────────────────

export interface AdminQRCode {
  id: string;
  business_id: string;
  token: string;
  campaign_name: string;
  status: QRStatus;
  dynamic: boolean;
  ab_testing: boolean;
  pause_fallback: boolean;
  created_at: string;
  updated_at: string;
  scan_count: number;
}

// ── Subscription ─────────────────────────────────────────────

export interface AdminSubscription {
  id: string;
  business_id: string;
  business_name: string;
  owner_email: string;
  plan: Plan;
  status: SubStatus;
  provider: string | null;
  provider_id: string | null;
  current_period_end: string | null;
  cancel_at_end: boolean;
  created_at: string;
  updated_at: string;
  invoices?: AdminInvoice[];
}

// ── Invoice ──────────────────────────────────────────────────

export interface AdminInvoice {
  id: string;
  subscription_id: string;
  business_id: string;
  amount_cents: number;
  currency: string;
  status: InvoiceStatus;
  provider_inv_id: string | null;
  pdf_url: string | null;
  created_at: string;
}

// ── Audit Log ────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

// ── Stats / Dashboard ─────────────────────────────────────────

export interface DashboardStats {
  total_businesses: number;
  total_businesses_delta: number;
  active_subscriptions: number;
  active_subscriptions_delta: number;
  paid_businesses: number;
  paid_businesses_delta: number;
  scans_today: number;
  scans_today_delta: number;
  reviews_today: number;
  reviews_today_delta: number;
  avg_copy_rate: number;
  avg_copy_rate_delta: number;
}

export interface DailyPoint {
  date: string;
  scans: number;
  reviews: number;
}

export interface PlanDist {
  plan: Plan;
  count: number;
}

export interface FunnelStep {
  event: string;
  count: number;
}

export interface DashboardCharts {
  daily_scans: DailyPoint[];
  plan_distribution: PlanDist[];
  event_funnel: FunnelStep[];
}

// ── Analytics ────────────────────────────────────────────────

export interface AnalyticsKPIs {
  total_scans: number;
  total_reviews: number;
  avg_copy_rate: number;
  avg_completion_rate: number;
  draft1_rate: number;
  draft2_rate: number;
}

export interface CountryStat {
  country: string;
  count: number;
}

export interface DeviceStat {
  device: string;
  count: number;
}

export interface TopBusiness {
  id: string;
  name: string;
  scans: number;
}

// ── Abuse ────────────────────────────────────────────────────

export type AbuseFlag = 'bot' | 'low-quality' | 'dead-funnel';

export interface AbuseEntry {
  business_id: string;
  business_name: string;
  qr_id: string;
  campaign_name: string;
  flag_type: AbuseFlag;
  scan_count: number;
  copy_rate: number;
  detected_at: string;
}

// ── API Pagination ────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

// ── requireAdmin result ───────────────────────────────────────

export interface AdminContext {
  user: { id: string; email: string };
  adminUser: AdminUser;
}
