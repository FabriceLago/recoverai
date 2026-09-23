import { Injectable, inject } from '@angular/core';
import { supabase } from '../core/supabase.client';
import { PLANS, type Plan, type PlanId } from './billing.model';
import { I18nService } from '../core/i18n/i18n.service';

// §33 abstraction. Payment is never required for the MVP: checkout goes through
// the create-checkout-session Edge Function (the Stripe secret key must never
// reach Angular) and reports "not configured" until STRIPE_SECRET_KEY is set.
@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly i18n = inject(I18nService);
  getPlans(): Plan[] {
    return PLANS;
  }

  async startCheckout(planId: PlanId): Promise<string> {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { plan_id: planId, return_url: window.location.href },
    });
    if (error) throw error;
    const url = (data as { url?: string } | null)?.url;
    if (!url) throw new Error(this.i18n.t('Billing is not configured for this project yet.'));
    return url;
  }
}
