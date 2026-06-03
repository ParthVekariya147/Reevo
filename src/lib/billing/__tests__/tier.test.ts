import { describe, it, expect } from 'vitest';
import { isPaid } from '../tier';

const FUTURE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const PAST   = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

describe('isPaid', () => {
  it('returns false for free plan', () => {
    expect(isPaid({ plan: 'free' })).toBe(false);
  });

  it('returns false for free plan even with future plan_expires_at', () => {
    expect(isPaid({ plan: 'free', plan_expires_at: FUTURE })).toBe(false);
  });

  it('returns true for starter with no plan_expires_at (permanent)', () => {
    expect(isPaid({ plan: 'starter' })).toBe(true);
  });

  it('returns true for starter with null plan_expires_at', () => {
    expect(isPaid({ plan: 'starter', plan_expires_at: null })).toBe(true);
  });

  it('returns true for pro with future plan_expires_at', () => {
    expect(isPaid({ plan: 'pro', plan_expires_at: FUTURE })).toBe(true);
  });

  it('returns false for pro with past plan_expires_at (admin override expired)', () => {
    expect(isPaid({ plan: 'pro', plan_expires_at: PAST })).toBe(false);
  });

  it('returns true for enterprise with no expiry', () => {
    expect(isPaid({ plan: 'enterprise' })).toBe(true);
  });

  it('returns false for enterprise with expired plan_expires_at', () => {
    expect(isPaid({ plan: 'enterprise', plan_expires_at: PAST })).toBe(false);
  });
});
