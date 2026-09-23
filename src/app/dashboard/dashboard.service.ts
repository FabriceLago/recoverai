import { Injectable } from '@angular/core';
import { supabase } from '../core/supabase.client';
import type { DashboardKpis } from './dashboard-kpis.model';
import type { OpportunityWithRisk } from './opportunity-with-risk.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  async getKpis(): Promise<DashboardKpis> {
    const { data, error } = await supabase.rpc('get_dashboard_kpis');
    if (error) throw error;
    return data as DashboardKpis;
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
