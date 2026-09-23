import { Injectable } from '@angular/core';
import { supabase } from '../core/supabase.client';
import type { EmailProviderName } from './email-provider.model';

export type IntegrationStatus = 'DISCONNECTED' | 'CONNECTED' | 'ERROR';

@Injectable({ providedIn: 'root' })
export class IntegrationsService {
  async getStatus(organizationId: string, provider: EmailProviderName): Promise<IntegrationStatus> {
    if (provider === 'MOCK') return 'CONNECTED';
    const { data, error } = await supabase
      .from('integrations')
      .select('status')
      .eq('organization_id', organizationId)
      .eq('provider', provider)
      .maybeSingle();
    if (error) throw error;
    return (data?.status as IntegrationStatus) ?? 'DISCONNECTED';
  }

  async setStatus(
    organizationId: string,
    provider: EmailProviderName,
    status: IntegrationStatus,
  ): Promise<void> {
    const { error } = await supabase
      .from('integrations')
      .upsert(
        { organization_id: organizationId, provider, status },
        { onConflict: 'organization_id,provider' },
      );
    if (error) throw error;
  }
}
