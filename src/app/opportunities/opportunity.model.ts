export type OpportunityStatus =
  | 'NEW'
  | 'QUALIFIED'
  | 'PROPOSAL_SENT'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST'
  | 'DORMANT';

export const OPPORTUNITY_STATUSES: OpportunityStatus[] = [
  'NEW',
  'QUALIFIED',
  'PROPOSAL_SENT',
  'NEGOTIATION',
  'WON',
  'LOST',
  'DORMANT',
];

export interface Opportunity {
  id: string;
  organization_id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  title: string;
  description: string | null;
  value: number;
  currency: string;
  status: OpportunityStatus;
  source: string | null;
  created_at: string;
  updated_at: string;
  last_contact_at: string | null;
  expected_close_date: string | null;
  email_count: number;
  reply_count: number;
  owner_id: string | null;
}

export interface OpportunityFormValue {
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  title: string;
  description: string | null;
  value: number;
  currency: string;
  status: OpportunityStatus;
  expected_close_date: string | null;
}
