import { Injectable, inject } from '@angular/core';
import { GmailProvider } from './gmail-provider';
import { MockEmailProvider } from './mock-email-provider';
import { OutlookProvider } from './outlook-provider';
import type { EmailProvider, EmailProviderName } from './email-provider.model';

@Injectable({ providedIn: 'root' })
export class EmailProviderRegistry {
  private readonly providers: Record<EmailProviderName, EmailProvider> = {
    MOCK: inject(MockEmailProvider),
    GMAIL: inject(GmailProvider),
    OUTLOOK: inject(OutlookProvider),
  };

  get(name: EmailProviderName): EmailProvider {
    return this.providers[name];
  }
}
