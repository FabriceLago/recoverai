import { Injectable } from '@angular/core';
import { supabase } from '../core/supabase.client';
import type { OpportunityRiskScore } from './risk-score.model';

@Injectable({ providedIn: 'root' })
export class RiskScoresService {
  async getForOpportunity(opportunityId: string): Promise<OpportunityRiskScore | null> {
    const { data, error } = await supabase
      .from('opportunity_risk_scores')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as OpportunityRiskScore;
  }

  async getForOpportunities(opportunityIds: string[]): Promise<Map<string, OpportunityRiskScore>> {
    if (opportunityIds.length === 0) return new Map();
    const { data, error } = await supabase
      .from('opportunity_risk_scores')
      .select('*')
      .in('opportunity_id', opportunityIds);
    if (error) throw error;
    const rows = (data ?? []) as OpportunityRiskScore[];
    return new Map(rows.map((row) => [row.opportunity_id, row]));
  }
}
