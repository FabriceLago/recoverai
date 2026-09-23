import { describe, expect, it } from 'vitest';
import { detectOpportunitySignals } from './opportunity-detection.service';

describe('detectOpportunitySignals', () => {
  it('flags a message with several buying signals as a likely opportunity', () => {
    const result = detectOpportunitySignals({
      subject: 'Quote request for our new website project',
      snippet: 'Could you send a proposal and pricing? Our budget is around 8k.',
    });
    expect(result.isLikelyOpportunity).toBe(true);
    expect(result.matchedSignals).toEqual(
      expect.arrayContaining(['quote', 'proposal', 'pricing', 'budget', 'project']),
    );
  });

  it('does not flag a newsletter with no buying signals', () => {
    const result = detectOpportunitySignals({
      subject: 'Your weekly digest',
      snippet: 'Here are the top stories of the week.',
    });
    expect(result.isLikelyOpportunity).toBe(false);
    expect(result.matchedSignals).toEqual([]);
  });

  it('does not flag a message with only a single weak signal', () => {
    const result = detectOpportunitySignals({
      subject: 'Project update',
      snippet: 'Just sharing some notes.',
    });
    expect(result.isLikelyOpportunity).toBe(false);
    expect(result.matchedSignals).toEqual(['project']);
  });

  it('recognizes French signals too', () => {
    const result = detectOpportunitySignals({
      subject: 'Demande de devis',
      snippet: 'Pouvez-vous envoyer un contrat et votre prix ?',
    });
    expect(result.isLikelyOpportunity).toBe(true);
  });
});
