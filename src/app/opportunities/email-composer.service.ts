import { Injectable } from '@angular/core';
import { supabase } from '../core/supabase.client';
import type { Opportunity } from './opportunity.model';
import type { RecommendedAction } from '../actions/action.model';
import type { GeneratedEmail } from './email-composer.model';

@Injectable({ providedIn: 'root' })
export class EmailComposerService {
  async generate(
    opportunity: Opportunity,
    recommendedAction: RecommendedAction | null,
  ): Promise<GeneratedEmail> {
    const { data, error } = await supabase.functions.invoke('generate-followup', {
      body: {
        opportunity: {
          company_name: opportunity.company_name,
          contact_name: opportunity.contact_name,
          title: opportunity.title,
          value: opportunity.value,
          currency: opportunity.currency,
          status: opportunity.status,
          email_count: opportunity.email_count,
          reply_count: opportunity.reply_count,
          last_contact_at: opportunity.last_contact_at,
          expected_close_date: opportunity.expected_close_date,
        },
        recommended_action: recommendedAction
          ? { action_type: recommendedAction.action_type, reason: recommendedAction.reason }
          : null,
      },
    });
    if (error) throw error;
    return data as GeneratedEmail;
  }

  // MVP simulation mode: never sends a real email (§24). Logs the message and
  // refreshes last_contact_at so the Risk Engine sees this as a real touchpoint.
  async simulateSend(opportunity: Opportunity, email: GeneratedEmail): Promise<void> {
    const now = new Date().toISOString();

    const { error: insertError } = await supabase.from('email_messages').insert({
      organization_id: opportunity.organization_id,
      opportunity_id: opportunity.id,
      provider: 'MOCK',
      direction: 'OUTBOUND',
      subject: email.subject,
      body: email.body,
      sent_at: now,
    });
    if (insertError) throw insertError;

    const { error: updateError } = await supabase
      .from('opportunities')
      .update({ last_contact_at: now, email_count: opportunity.email_count + 1 })
      .eq('id', opportunity.id);
    if (updateError) throw updateError;
  }
}
