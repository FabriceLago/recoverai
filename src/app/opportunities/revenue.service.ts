import { Injectable } from '@angular/core';
import { supabase } from '../core/supabase.client';
import type { Opportunity } from './opportunity.model';

@Injectable({ providedIn: 'root' })
export class RevenueService {
  async markAsRecovered(opportunityId: string, amount: number): Promise<Opportunity> {
    const { data, error } = await supabase.rpc('mark_opportunity_recovered', {
      target_opportunity_id: opportunityId,
      recovered_amount: amount,
    });
    if (error) throw error;
    return data as Opportunity;
  }
}
