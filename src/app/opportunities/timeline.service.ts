import { Injectable } from '@angular/core';
import { supabase } from '../core/supabase.client';
import type { Opportunity } from './opportunity.model';
import type { TimelineEntry } from './timeline.model';

@Injectable({ providedIn: 'root' })
export class TimelineService {
  async getForOpportunity(opportunity: Opportunity): Promise<TimelineEntry[]> {
    const [emailsResult, revenueResult] = await Promise.all([
      supabase
        .from('email_messages')
        .select('direction, subject, sent_at, received_at')
        .eq('opportunity_id', opportunity.id),
      supabase
        .from('revenue_events')
        .select('event_type, amount, currency, created_at')
        .eq('opportunity_id', opportunity.id),
    ]);
    if (emailsResult.error) throw emailsResult.error;
    if (revenueResult.error) throw revenueResult.error;

    const entries: TimelineEntry[] = [
      { type: 'CREATED', label: 'Opportunity created', at: opportunity.created_at },
    ];

    for (const email of emailsResult.data ?? []) {
      const outbound = email.direction === 'OUTBOUND';
      const at = outbound ? email.sent_at : email.received_at;
      if (!at) continue;
      entries.push({
        type: outbound ? 'EMAIL_OUTBOUND' : 'EMAIL_INBOUND',
        label: outbound
          ? `Email sent: ${email.subject || '(no subject)'}`
          : `Email received: ${email.subject || '(no subject)'}`,
        at,
      });
    }

    for (const event of revenueResult.data ?? []) {
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: event.currency,
      }).format(event.amount);
      entries.push({
        type: event.event_type as TimelineEntry['type'],
        label: `${event.event_type === 'RECOVERED' ? 'Revenue recovered' : event.event_type} — ${formatted}`,
        at: event.created_at,
      });
    }

    return entries.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }
}
