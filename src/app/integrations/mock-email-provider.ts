import { Injectable } from '@angular/core';
import type { EmailProvider, InboxMessage } from './email-provider.model';

// Always "connected" and returns clearly-fake messages, so the whole MVP
// (including opportunity detection) can be exercised without any real inbox.
@Injectable({ providedIn: 'root' })
export class MockEmailProvider implements EmailProvider {
  readonly name = 'MOCK' as const;

  async isConnected(): Promise<boolean> {
    return true;
  }

  async connect(): Promise<void> {}

  async disconnect(): Promise<void> {}

  async listRecentMessages(_organizationId: string, limit = 10): Promise<InboxMessage[]> {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const messages: InboxMessage[] = [
      {
        id: 'mock-1',
        from: 'alex.martin@novadigital.example',
        subject: 'Quote request for our new website project',
        snippet: 'Hi, could you send a proposal and pricing for a full corporate website? Our budget is around 8k.',
        receivedAt: new Date(now - 1 * day).toISOString(),
      },
      {
        id: 'mock-2',
        from: 'jordan.dubois@atlasstudio.example',
        subject: 'Meeting next week?',
        snippet: 'Would love to schedule a meeting to discuss the contract terms for the mobile app.',
        receivedAt: new Date(now - 3 * day).toISOString(),
      },
      {
        id: 'mock-3',
        from: 'newsletter@example.com',
        subject: 'Your weekly digest',
        snippet: 'Here are the top stories of the week.',
        receivedAt: new Date(now - 5 * day).toISOString(),
      },
    ];
    return messages.slice(0, limit);
  }
}
