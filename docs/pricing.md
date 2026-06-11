# Pricing — Reevo

## Plans at a Glance

| | Free | Starter | Growth | Enterprise |
|---|---|---|---|---|
| **Monthly price** | $0 | See DB | See DB | Custom |
| **Annual price** | $0 | Up to 17% off | Up to 17% off | Custom |
| **Locations** | 1 | 1 | Up to 5 | Unlimited |
| **Reviews / month** | 20 | 200 | 500 | Unlimited |
| **Scans / month** | 20 | 200 | 500 | Unlimited |
| **QR codes** | 1 static | Unlimited dynamic | Unlimited dynamic | Unlimited dynamic |
| **Active campaigns** | 1 | 3 | 5 | Unlimited |
| **AI model** | GPT-3.5 | GPT-3.5 | GPT-4 | GPT-4 + tone training |
| **Languages** | 1 | 4 | 8 | 24 |
| **Custom branding** | No | Yes | Yes + domain | Yes + domain |
| **Auto-reply to reviews** | No | No | Yes | Yes |
| **Device & geo analytics** | No | No | Yes | Yes |
| **Export to CSV / API** | No | No | Yes | Yes |
| **Team seats** | 1 | 1 | 5 | Unlimited |
| **Role-based access (RBAC)** | No | No | No | Yes |
| **SSO (Google, SAML)** | No | No | No | Yes |
| **Audit log** | No | No | No | Yes |
| **Email support** | Yes | Yes | Yes | Yes |
| **Priority support** | No | No | Yes | Yes |
| **Dedicated CSM** | No | No | No | Yes |
| **Onboarding session** | No | No | 30 min | 2 hours |
| **14-day full trial** | Yes | — | — | — |
| **Credit card required** | No | Yes | Yes | Yes |

> Exact prices are stored in the `plan_prices` table in Supabase and surfaced via the pricing page. Contact sales for Enterprise pricing.

---

## Free Plan — Permanent Limits

After the 14-day full-access trial, the Free plan retains these limits forever:

- 1 location
- 20 AI-drafted reviews per month
- 20 QR scans per month
- 1 QR code (static)
- 1 active campaign
- Basic AI review suggestions (GPT-3.5)
- Standard analytics

The funnel keeps working when the review limit is reached — AI suggestions pause until the next billing cycle.

---

## Annual Billing

- Toggle between monthly and annual on the pricing page.
- Annual billing saves up to **17%** vs. paying monthly.
- Savings amount is shown per plan (`Save $X/yr vs monthly`).
- Annual charges are billed upfront as a single payment.
- Invoices are generated for each charge with VAT, business name, and tax ID fields.

---

## Upgrades & Downgrades

- Upgrade any time → takes effect immediately; charge is prorated.
- Downgrade any time → takes effect at the next billing cycle.
- Cancellation → subscription remains active until the end of the paid period.

---

## Feature Comparison Detail

### Funnels

| Feature | Free | Starter | Growth | Enterprise |
|---------|------|---------|--------|-----------|
| Locations | 1 | 1 | Up to 5 | Unlimited |
| QR codes | 1 static | Unlimited dynamic | Unlimited dynamic | Unlimited dynamic |
| Active campaigns | 1 | 3 | 5 | Unlimited |
| Branded domain | No | Yes | Yes | Yes |

### AI

| Feature | Free | Starter | Growth | Enterprise |
|---------|------|---------|--------|-----------|
| Reviews per month | 20 | 200 | 500 | Unlimited |
| AI model | GPT-3.5 | GPT-3.5 | GPT-4 | GPT-4 + tone |
| Languages | 1 | 4 | 8 | 24 |
| Auto-reply to reviews | No | No | Yes | Yes |

### Analytics

| Feature | Free | Starter | Growth | Enterprise |
|---------|------|---------|--------|-----------|
| Real-time dashboards | Yes | Yes | Yes | Yes |
| Funnel breakdown | Basic | Standard | Advanced | Advanced + cohorts |
| Device & geo analytics | No | No | Yes | Yes |
| Export to CSV / API | No | No | Yes | Yes |

### Workspace

| Feature | Free | Starter | Growth | Enterprise |
|---------|------|---------|--------|-----------|
| Team seats | 1 | 1 | 5 | Unlimited |
| Role-based access | No | No | No | Yes |
| SSO (Google, SAML) | No | No | No | Yes |
| Audit log | No | No | No | Yes |

### Support

| Feature | Free | Starter | Growth | Enterprise |
|---------|------|---------|--------|-----------|
| Email support | Yes | Yes | Yes | Yes |
| Priority support | No | No | Yes | Yes |
| Dedicated CSM | No | No | No | Yes |
| Onboarding session | No | No | 30 min | 2 hours |

---

## Enterprise

For franchises, multi-brand operators, and agencies managing 50+ locations.

Includes everything in Growth, plus:

- Custom volume pricing
- Dedicated Customer Success Manager (CSM)
- White-label option
- SSO (Google OAuth + SAML 2.0)
- SCIM provisioning
- Role-based access control
- Full audit log
- Multi-tenant workspaces
- API + webhook integrations
- Contractual SLA (99.99% uptime)
- SOC 2 Type II certification
- GDPR compliance pack

Contact: `/contact` page or email sales.

---

## Discounts

| Discount | Amount | Eligibility |
|---------|--------|------------|
| Annual billing | Up to 17% | Any paid plan |
| Non-profit | 50% off | Verified non-profits (Starter, Growth, Enterprise) |
| Education | 50% off | Verified educational institutions (Starter, Growth, Enterprise) |

Contact sales to apply for non-profit / education discounts.

---

## Billing FAQ

**Is there really a free plan?**
Yes — Free gives you a full 14-day trial with no credit card required. After the trial, you keep 1 location, 20 AI-drafted reviews per month, and one QR code forever.

**Can I switch between plans?**
Yes. Upgrade or downgrade any time from the billing page. Upgrades are prorated; downgrades take effect at the next billing cycle.

**Do you charge per location?**
No per-location fees on Growth and Enterprise. Growth includes up to 5 locations; Enterprise is unlimited.

**What happens if I exceed limits on the free plan?**
The funnel keeps working — but new AI suggestions pause once you hit 20 in a month. Reviews already in flight always complete.

**Can I get an invoice?**
Yes. Every charge generates a downloadable PDF invoice with VAT, business name, and tax ID fields editable in billing.

**Do you offer non-profit or education discounts?**
Yes — 50% off Starter, Growth, and Enterprise for verified non-profits and educational institutions. Contact sales to apply.

---

## Payment Processing

- Payments processed via **Stripe**.
- Invoices generated automatically on each charge.
- PDF invoices available for download from the billing dashboard.
- Supported currencies: USD (default); additional currencies via Stripe.
