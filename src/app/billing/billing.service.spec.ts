import { describe, expect, it } from 'vitest';
import { PLANS } from './billing.model';
import { isSafeCheckoutUrl } from './billing.service';

describe('PLANS', () => {
  it('matches the spec pricing (§32)', () => {
    expect(PLANS.map((p) => [p.id, p.priceEurMonthly])).toEqual([
      ['STARTER', 49],
      ['PRO', 99],
      ['BUSINESS', 249],
    ]);
  });
});

describe('isSafeCheckoutUrl', () => {
  it('accepts Stripe hosted checkout over https', () => {
    expect(isSafeCheckoutUrl('https://checkout.stripe.com/c/pay/cs_test_123')).toBe(true);
  });

  it('refuses other hosts, even lookalikes', () => {
    expect(isSafeCheckoutUrl('https://evil.example/checkout')).toBe(false);
    expect(isSafeCheckoutUrl('https://checkout.stripe.com.evil.example/pay')).toBe(false);
    expect(isSafeCheckoutUrl('https://notstripe.com/pay')).toBe(false);
  });

  it('refuses non-https and script URLs', () => {
    expect(isSafeCheckoutUrl('http://checkout.stripe.com/pay')).toBe(false);
    expect(isSafeCheckoutUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeCheckoutUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('refuses garbage', () => {
    expect(isSafeCheckoutUrl('not a url')).toBe(false);
    expect(isSafeCheckoutUrl('')).toBe(false);
  });
});
