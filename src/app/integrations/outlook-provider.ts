import { Injectable, inject } from '@angular/core';
import { IntegrationsService } from './integrations.service';
import type { EmailProvider, InboxMessage } from './email-provider.model';
import { I18nService } from '../core/i18n/i18n.service';

// §29: same shape as GmailProvider, for Microsoft Graph. Stays a stub until
// Microsoft OAuth credentials and the matching Edge Function exist; must never
// block the MVP, which runs on MockEmailProvider.
@Injectable({ providedIn: 'root' })
export class OutlookProvider implements EmailProvider {
  readonly name = 'OUTLOOK' as const;
  private readonly i18n = inject(I18nService);
  private readonly integrations = inject(IntegrationsService);

  async isConnected(organizationId: string): Promise<boolean> {
    return (await this.integrations.getStatus(organizationId, 'OUTLOOK')) === 'CONNECTED';
  }

  async connect(): Promise<void> {
    throw new Error(this.i18n.t('Outlook is not configured for this project yet (missing Microsoft OAuth credentials).'));
  }

  async disconnect(organizationId: string): Promise<void> {
    await this.integrations.setStatus(organizationId, 'OUTLOOK', 'DISCONNECTED');
  }

  async listRecentMessages(organizationId: string): Promise<InboxMessage[]> {
    if (!(await this.isConnected(organizationId))) {
      throw new Error(this.i18n.t('Outlook is not connected.'));
    }
    throw new Error(this.i18n.t('Outlook message sync is not implemented yet.'));
  }
}
