import { Injectable } from '@angular/core';
import { supabase } from '../core/supabase.client';
import type { DashboardKpis } from './dashboard-kpis.model';
import type { OpportunityWithRisk } from './opportunity-with-risk.model';
import type { RiskLevel } from '../opportunities/risk-score.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  async getKpis(): Promise<DashboardKpis> {
    const { data, error } = await supabase.rpc('get_dashboard_kpis');
    if (error) throw error;
    return data as DashboardKpis;
  }

  async getRiskBreakdown(): Promise<Record<RiskLevel, number>> {
    const { data, error } = await supabase
      .from('opportunities_with_risk')
      .select('value, risk_level')
      .not('status', 'in', '(WON,LOST)');
    if (error) throw error;
    const totals: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    for (const row of data ?? []) {
      totals[row.risk_level as RiskLevel] += Number(row.value);
    }
    return totals;
  }

  async getNeedsAttention(limit = 5): Promise<OpportunityWithRisk[]> {
    const { data, error } = await supabase
      .from('opportunities_with_risk')
      .select('*')
      .not('status', 'in', '(WON,LOST)')
      .order('risk_score', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as OpportunityWithRisk[];
  }
}
