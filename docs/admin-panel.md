# Admin Panel — Reevo

The Reevo admin panel is a separate, privileged dashboard accessible only to internal team members with an entry in the `admin_users` table.

---

## Access Control

### Requirements to access admin panel
1. Authenticated Supabase session (regular signup/login).
2. Email address exists in `admin_users` table (seeded by a super-admin).
3. Every admin API request includes `x-admin-id` header matching the JWT `user.id`.
4. Rate limited at 60 req/min/IP.

### Setup
Run migration `012_admin_panel.sql` first, then seed the `admin_users` table:
```sql
insert into admin_users (user_id, email, role) values ('<uuid>', 'admin@reevo.io', 'super_admin');
```

---

## Admin Panel Screens

### Dashboard — Overview
Platform-wide KPIs and activity:
- Total businesses (by plan)
- Monthly revenue estimate
- New signups (last 30 days)
- Total scans / reviews generated
- AI usage by provider

### Businesses
Paginated list of all registered businesses:
- Search by name (max 100 chars)
- Filter by plan, status
- Per-business: scan count (via `admin_scan_counts_by_business` RPC — no N+1)
- Actions: view detail, change plan, suspend, delete

### Business Detail
Full view of a single business:
- Owner info, plan, subscription status
- QR campaigns with per-QR scan counts (via `admin_scan_counts_by_qr` RPC)
- Review history (sample)
- Billing/subscription detail
- Plan override (returns HTTP 207 with `ok: false, partial: true` on partial failure)

### Analytics
Platform-wide analytics via DB-side RPCs (no OOM risk — no JS aggregation of large datasets):
- Scan counts by country (`admin_count_by_country`)
- Scan counts by device type (`admin_count_by_device`)
- Top businesses by scan count (`admin_top_businesses_by_scans`)
- Draft copy counts (`admin_count_draft_copies`)

### Subscriptions
All subscription records:
- Filter by status (`active`, `trialing`, `past_due`, `cancelled`)
- Stripe subscription ID linkage
- Period start/end, cancel-at-end flag

### Notifications
System notification management:
- Create platform-wide announcements
- Mark notifications as read/resolved

### Abuse
Flagged accounts and abuse reports:
- Review flagged businesses
- Suspend / ban actions (logged to audit log)

### Audit Log
Paginated log of all admin actions:
- Actor (admin user)
- Action (e.g. `suspend_business`, `change_plan`, `delete_review`)
- Target type + ID
- Metadata (reason, old value, new value)
- Timestamp

### AI Settings
Admin control over AI configuration:
- Review AI key pool management
- GBP reply AI settings
- Model selection overrides per plan tier

### Admin Users (Settings)
Manage who has admin access:
- Add admin by email (uses paginated Auth REST API — no full user list load)
- Remove admin access
- Role assignment

---

## Security Notes

- Admin routes use `createAdminClient()` (service-role key) only after ownership/auth checks.
- All mutations are logged to `audit_logs` before executing.
- Plan change failures return HTTP 207 (partial success) rather than silently reporting `ok: true`.
- Admin user lookup uses Supabase Auth paginated REST API (`/auth/v1/admin/users?email=...&page=1&per_page=1`) — never loads all users into memory.

---

## Performance Architecture

All aggregation queries in the admin panel use Postgres RPCs to avoid OOM issues at scale:

| RPC | Purpose |
|-----|---------|
| `admin_count_by_country` | Scan counts grouped by country |
| `admin_count_by_device` | Scan counts grouped by device type |
| `admin_top_businesses_by_scans` | Top N businesses ranked by scan count |
| `admin_count_draft_copies` | Count draft copies by index |
| `admin_scan_counts_by_business` | Replaces N+1 per-business scan loop |
| `admin_scan_counts_by_qr` | Per-QR scan counts for business detail |
| `billing_event_counts` | Billing usage aggregation |
| `billing_daily_generates` | Daily generate counts for billing period |
| `billing_campaign_generates` | Generate counts per campaign |
| `analytics_summary` | Business-scoped analytics aggregation |

All RPCs defined in `database/021_analytics_rpcs.sql`, `022_billing_usage_rpcs.sql`, `023_scan_count_rpcs.sql`.
