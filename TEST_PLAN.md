# GBP Automated Review Reply — Test Plan

Run the full suite: `npm run test:gbp`

---

## Unit Tests

### `src/lib/security/__tests__/encrypt.test.ts`

| Case | Status |
|---|---|
| round-trips a short plaintext string | PASS |
| round-trips a long string with special characters | PASS |
| produces a colon-delimited blob with 3 parts (iv:authTag:ciphertext) | PASS |
| produces different ciphertext for same plaintext (random IV) | PASS |
| throws on tampered ciphertext | PASS |
| throws on zeroed authTag | PASS |
| throws on malformed blob (wrong number of parts) | PASS |
| key validation guard: wrong-length key throws at runtime | PASS |

### `src/lib/billing/__tests__/tier.test.ts`

| Case | Status |
|---|---|
| free plan → false | PASS |
| free plan with future plan_expires_at → false | PASS |
| starter, no plan_expires_at → true | PASS |
| starter, null plan_expires_at → true | PASS |
| pro, future plan_expires_at → true | PASS |
| pro, past plan_expires_at → false (admin override expired) | PASS |
| enterprise, no expiry → true | PASS |
| enterprise, expired plan_expires_at → false | PASS |

### `src/lib/gbp/__tests__/oauth.test.ts`

| Case | Status |
|---|---|
| buildState/parseState round-trips businessId and next | PASS |
| tampered state returns null | PASS |
| expired state (>10 min) returns null | PASS |
| unsafe next path sanitised to /app/business_dashboard | PASS |
| invalid base64 returns null | PASS |
| starRatingToInt maps ONE–FIVE correctly | PASS |
| starRatingToInt returns 0 for unknown | PASS |
| withRetry: returns on first success | PASS |
| withRetry: retries on 429, succeeds on second attempt | PASS |
| withRetry: retries on 503 (5xx transient) | PASS |
| withRetry: does NOT retry on 401 | PASS |
| withRetry: does NOT retry on 404 | PASS |
| withRetry: exhausts retries and re-throws | PASS |
| withRetry: does NOT retry plain Error (no .status) | PASS |

---

## Route Tests

### `src/app/api/gbp/__tests__/connect.test.ts`

| Case | Status |
|---|---|
| unauthenticated → redirect to /login | PASS |
| user with no business → 404 | PASS |
| redirect to Google with scope=business.manage | PASS |
| redirect has access_type=offline | PASS |
| redirect has prompt=consent | PASS |
| buildState called with correct businessId | PASS |
| state from buildState embedded in redirect URL | PASS |
| default next = /app/business_dashboard when not provided | PASS |
| valid next param preserved in state | PASS |
| createOAuth2Client throws → 503 | PASS |

### `src/app/api/gbp/__tests__/callback.test.ts`

| Case | Status |
|---|---|
| Google error param → gbp_error=denied | PASS |
| missing code → gbp_error=missing | PASS |
| missing state → gbp_error=missing | PASS |
| parseState returns null → gbp_error=invalid_state | PASS |
| valid flow → upsert connection, redirect to next | PASS |
| refresh token stored ENCRYPTED (not plaintext) | PASS |
| encrypted token decrypts back to original | PASS |
| multiple locations → multiple connection rows | PASS |
| reply_settings initialised with business_id | PASS |
| missing refresh_token + existing active connection → success | PASS |
| missing refresh_token + no existing connection → gbp_error=no_refresh_token | PASS |
| getToken throws → gbp_error=token_exchange | PASS |

### `src/app/api/gbp/__tests__/disconnect.test.ts`

| Case | Status |
|---|---|
| unauthenticated → 401 | PASS |
| no business found → 404 | PASS |
| no connection_id → all business connections revoked, id filter absent | PASS |
| with connection_id → both business_id and id filters applied | PASS |
| authz: business_id always scoped to authenticated user | PASS |

### `src/app/api/cron/__tests__/gbp-sync.test.ts`

| Case | Status |
|---|---|
| missing auth header → 401 | PASS |
| wrong CRON_SECRET → 401 | PASS |
| valid CRON_SECRET → 200 | PASS |
| no active connections → {connections:0, newReviews:0, errors:0} | PASS |
| one connection, one review → newReviews:1 | PASS |
| inserted review has reply_status=pending | PASS |
| dedup: second run with DB unique_violation → newReviews:0 | PASS |
| dedup: Redis key present → insert skipped | PASS |
| invalid_grant on token refresh → connection set to error, batch continues | PASS |
| 429 from reviews API (backoff path) → errors:1, batch continues | PASS |
| null refresh_token → skipped, errors:0 | PASS |

---

## Extending This Plan (Phase 3 and beyond)

Add new sections below for each phase:

### Phase 3: Reply Generation + Decision Engine
_[To be filled in during Phase 3]_

### Phase 4: Approval UI + Admin Controls
_[To be filled in during Phase 4]_
