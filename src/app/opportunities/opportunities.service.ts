import { Injectable } from '@angular/core';
import { supabase } from '../core/supabase.client';
import type { Opportunity, OpportunityFormValue, OpportunityStatus } from './opportunity.model';

export interface OpportunityListParams {
  search?: string;
  status?: OpportunityStatus | '';
  sortBy?: keyof Opportunity;
  sortAscending?: boolean;
  page?: number;
  pageSize?: number;
}

export interface OpportunityListResult {
  data: Opportunity[];
  count: number;
}

@Injectable({ providedIn: 'root' })
export class OpportunitiesService {
  async list(params: OpportunityListParams): Promise<OpportunityListResult> {
    const {
      search = '',
      status = '',
      sortBy = 'created_at',
      sortAscending = false,
      page = 0,
      pageSize = 20,
    } = params;

    let query = supabase.from('opportunities').select('*', { count: 'exact' });

    if (search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`company_name.ilike.${term},title.ilike.${term}`);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const from = page * pageSize;
    const to = from + pageSize - 1;
    query = query.order(sortBy, { ascending: sortAscending }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: (data ?? []) as Opportunity[], count: count ?? 0 };
  }

  async getById(id: string): Promise<Opportunity | null> {
    const { data, error } = await supabase.from('opportunities').select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as Opportunity;
  }

  async create(organizationId: string, input: OpportunityFormValue): Promise<Opportunity> {
    const { data, error } = await supabase
      .from('opportunities')
      .insert({ ...input, organization_id: organizationId })
      .select('*')
      .single();
    if (error) throw error;
    return data as Opportunity;
  }

  async update(id: string, input: Partial<OpportunityFormValue>): Promise<Opportunity> {
    const { data, error } = await supabase
      .from('opportunities')
      .update(input)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as Opportunity;
  }

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('opportunities').delete().eq('id', id);
    if (error) throw error;
  }
}
