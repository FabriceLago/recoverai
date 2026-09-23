import { describe, expect, it } from 'vitest';
import { generateOpportunity, randomStatus } from './simulation.service';

describe('generateOpportunity', () => {
  it('never sets last_contact_at before created_at, across many samples', () => {
    for (let i = 0; i < 200; i++) {
      const opp = generateOpportunity('org-1');
      expect(new Date(opp.last_contact_at).getTime()).toBeGreaterThanOrEqual(
        new Date(opp.created_at).getTime(),
      );
    }
  });

  it('always sets email_count >= reply_count', () => {
    for (let i = 0; i < 200; i++) {
      const opp = generateOpportunity('org-1');
      expect(opp.email_count).toBeGreaterThanOrEqual(opp.reply_count);
    }
  });

  it('tags every generated row with the simulation source', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateOpportunity('org-1').source).toBe('SIMULATION');
    }
  });

  it('always produces a non-negative value', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateOpportunity('org-1').value).toBeGreaterThan(0);
    }
  });
});

describe('randomStatus', () => {
  it('only ever returns a valid OpportunityStatus', () => {
    const valid = new Set(['NEW', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST', 'DORMANT']);
    for (let i = 0; i < 200; i++) {
      expect(valid.has(randomStatus())).toBe(true);
    }
  });

  it('produces more than one distinct status across many samples', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(randomStatus());
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
