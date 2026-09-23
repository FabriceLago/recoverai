import { Injectable } from '@angular/core';
import { supabase } from '../core/supabase.client';
import type { ActionStatus, ActionType, RecommendedAction } from './action.model';

@Injectable({ providedIn: 'root' })
export class ActionsService {
  async list(status: ActionStatus, actionTypes?: ActionType[]): Promise<RecommendedAction[]> {
    let query = supabase
      .from('recommended_actions')
      .select('*, opportunity:opportunities(*)')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (actionTypes?.length) {
      query = query.in('action_type', actionTypes);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as unknown as RecommendedAction[];
  }

  async getForOpportunities(opportunityIds: string[]): Promise<Map<string, RecommendedAction>> {
    if (opportunityIds.length === 0) return new Map();
    const { data, error } = await supabase
      .from('recommended_actions')
      .select('*, opportunity:opportunities(*)')
      .in('opportunity_id', opportunityIds)
      .eq('status', 'PENDING');
    if (error) throw error;
    const rows = (data ?? []) as unknown as RecommendedAction[];
    return new Map(rows.map((row) => [row.opportunity_id, row]));
  }

  async getForOpportunity(opportunityId: string): Promise<RecommendedAction | null> {
    const { data, error } = await supabase
      .from('recommended_actions')
      .select('*, opportunity:opportunities(*)')
      .eq('opportunity_id', opportunityId)
      .eq('status', 'PENDING')
      .maybeSingle();
    if (error) throw error;
    return data as unknown as RecommendedAction | null;
  }

  async complete(id: string): Promise<void> {
    const { error } = await supabase
      .from('recommended_actions')
      .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  async dismiss(id: string): Promise<void> {
    const { error } = await supabase
      .from('recommended_actions')
      .update({ status: 'DISMISSED' })
      .eq('id', id);
    if (error) throw error;
  }
}
