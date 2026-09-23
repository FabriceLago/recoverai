import type { InboxMessage } from './email-provider.model';

// §30 signals. Kept as plain keyword matching on purpose (deterministic,
// explainable, testable) — the spec says AI may assist classification later,
// but a human must always validate before a detected message becomes a real
// opportunity, so this only ever *suggests*, it never creates anything.
const SIGNAL_KEYWORDS: Record<string, string[]> = {
  quote: ['quote', 'devis'],
  proposal: ['proposal', 'proposition'],
  budget: ['budget'],
  pricing: ['pricing', 'price', 'prix'],
  project: ['project', 'projet'],
  meeting: ['meeting', 'rendez-vous', 'réunion'],
  contract: ['contract', 'contrat'],
  purchase: ['purchase', 'achat', 'order'],
};

export interface DetectionResult {
  isLikelyOpportunity: boolean;
  matchedSignals: string[];
}

export function detectOpportunitySignals(message: Pick<InboxMessage, 'subject' | 'snippet'>): DetectionResult {
  const haystack = `${message.subject} ${message.snippet}`.toLowerCase();
  const matchedSignals = Object.entries(SIGNAL_KEYWORDS)
    .filter(([, keywords]) => keywords.some((keyword) => haystack.includes(keyword)))
    .map(([signal]) => signal);

  // ponytail: two distinct signals is an arbitrary-but-cautious threshold to
  // avoid flagging every email that merely says "project"; tune with real data.
  return { isLikelyOpportunity: matchedSignals.length >= 2, matchedSignals };
}
