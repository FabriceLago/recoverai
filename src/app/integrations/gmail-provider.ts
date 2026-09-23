import { Injectable, inject } from '@angular/core';
import { IntegrationsService } from './integrations.service';
import type { EmailProvider, InboxMessage } from './email-provider.model';
import { I18nService } from '../core/i18n/i18n.service';

// §28: the real flow (Connect → OAuth → Edge Function → encrypted credentials →
// Gmail API) needs Google OAuth credentials and an Edge Function that don't
// exist yet. Secrets must never live in Angular, so until that Edge Function is
// built this stays a stub that fails loudly instead of pretending to work —
// and never blocks the rest of the app, which runs on MockEmailProvider.
@Injectable({ providedIn: 'root' })
export class GmailProvider implements EmailProvider {
  readonly name = 'GMAIL' as const;
  private readonly i18n = inject(I18nService);
  private readonly integrations = inject(IntegrationsService);

  async isConnected(organizationId: string): Promise<boolean> {
    return (await this.integrations.getStatus(organizationId, 'GMAIL')) === 'CONNECTED';
  }

  async connect(): Promise<void> {
    throw new Error(this.i18n.t('Gmail is not configured for this project yet (missing Google OAuth credentials).'));
  }

  async disconnect(organizationId: string): Promise<void> {
    await this.integrations.setStatus(organizationId, 'GMAIL', 'DISCONNECTED');
  }

  async listRecentMessages(organizationId: string): Promise<InboxMessage[]> {
    if (!(await this.isConnected(organizationId))) {
      throw new Error(this.i18n.t('Gmail is not connected.'));
    }
    throw new Error(this.i18n.t('Gmail message sync is not implemented yet.'));
  }
}
