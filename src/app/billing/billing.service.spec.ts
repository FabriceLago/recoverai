import { describe, expect, it } from 'vitest';
import { PLANS } from './billing.model';

describe('PLANS', () => {
  it('matches the spec pricing (§32)', () => {
    expect(PLANS.map((p) => [p.id, p.priceEurMonthly])).toEqual([
      ['STARTER', 49],
      ['PRO', 99],
      ['BUSINESS', 249],
    ]);
  });
});
