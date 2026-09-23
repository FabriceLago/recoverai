import { Injectable } from '@angular/core';
import { supabase } from '../core/supabase.client';
import type { OpportunityStatus } from '../opportunities/opportunity.model';

const SIMULATION_SOURCE = 'SIMULATION';

const COMPANY_NAMES = [
  'Nova Digital',
  'Atlas Studio',
  'BrightPath',
  'Kernel Labs',
  'Vertex Agency',
  'Northwind Co',
  'Solstice Media',
  'Clearline',
  'Momentum Group',
  'Orbit Works',
  'Harbor & Co',
  'Pinnacle Tech',
  'Everline',
  'Meridian Studio',
  'Anchor Digital',
  'Fieldstone',
  'Lumen Agency',
  'Crestwood',
  'Ironclad Solutions',
  'Bluepeak',
];

const OPPORTUNITY_TEMPLATES = [
  { title: 'E-commerce redesign', value: 7500 },
  { title: 'Mobile app', value: 12000 },
  { title: 'Corporate website', value: 4500 },
  { title: 'Annual SEO retainer', value: 6000 },
  { title: 'B2B SaaS platform', value: 15000 },
  { title: 'Brand identity refresh', value: 5500 },
  { title: 'Marketing automation setup', value: 8500 },
  { title: 'CRM integration', value: 9500 },
  { title: 'Landing page sprint', value: 3200 },
  { title: 'Content strategy', value: 4200 },
  { title: 'Product launch campaign', value: 11000 },
  { title: 'Internal dashboard build', value: 13500 },
  { title: 'Email marketing overhaul', value: 3800 },
  { title: 'API integration project', value: 10500 },
  { title: 'UX audit and redesign', value: 6800 },
];

const CONTACT_FIRST_NAMES = [
  'Alex',
  'Jordan',
  'Sam',
  'Morgan',
  'Taylor',
  'Casey',
  'Robin',
  'Jamie',
];
const CONTACT_LAST_NAMES = [
  'Martin',
  'Bernard',
  'Dubois',
  'Laurent',
  'Lefevre',
  'Moreau',
  'Garcia',
  'Roux',
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

// Weighted so most demo opportunities stay open (where the Risk Engine has
// something to say) while a few show WON/LOST/DORMANT for status variety.
export function randomStatus(): OpportunityStatus {
  const roll = Math.random();
  if (roll < 0.1) return 'WON';
  if (roll < 0.15) return 'LOST';
  if (roll < 0.2) return 'DORMANT';
  return pick(['NEW', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION']);
}

export interface SimulatedOpportunity {
  organization_id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  title: string;
  value: number;
  currency: string;
  status: OpportunityStatus;
  source: string;
  created_at: string;
  last_contact_at: string;
  expected_close_date: string;
  email_count: number;
  reply_count: number;
}

export function generateOpportunity(organizationId: string): SimulatedOpportunity {
  const company = pick(COMPANY_NAMES);
  const template = pick(OPPORTUNITY_TEMPLATES);
  const contactName = `${pick(CONTACT_FIRST_NAMES)} ${pick(CONTACT_LAST_NAMES)}`;
  const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '');

  const createdDaysAgo = randomInt(5, 90);
  // Spans every time-risk bucket (0-3, 4-7, 8-14, 15-21, >21 days), capped so
  // the opportunity can't have been contacted before it was created.
  const contactDaysAgo = Math.min(randomInt(0, 35), createdDaysAgo);
  const replyCount = randomInt(0, 5);

  return {
    organization_id: organizationId,
    company_name: company,
    contact_name: contactName,
    contact_email: `${contactName.toLowerCase().replace(' ', '.')}@${slug}.example`,
    title: template.title,
    value: template.value,
    currency: 'EUR',
    status: randomStatus(),
    source: SIMULATION_SOURCE,
    created_at: daysAgo(createdDaysAgo),
    last_contact_at: daysAgo(contactDaysAgo),
    expected_close_date: daysFromNow(randomInt(-10, 60)),
    email_count: replyCount + randomInt(0, 3),
    reply_count: replyCount,
  };
}

@Injectable({ providedIn: 'root' })
export class SimulationService {
  async isActive(): Promise<boolean> {
    const { count, error } = await supabase
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('source', SIMULATION_SOURCE);
    if (error) throw error;
    return (count ?? 0) > 0;
  }

  async activate(organizationId: string): Promise<number> {
    const count = randomInt(15, 30);
    const rows = Array.from({ length: count }, () => generateOpportunity(organizationId));
    const { error } = await supabase.from('opportunities').insert(rows);
    if (error) throw error;
    return count;
  }
}
