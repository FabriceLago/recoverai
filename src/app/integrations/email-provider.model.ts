export type EmailProviderName = 'MOCK' | 'GMAIL' | 'OUTLOOK';

export interface InboxMessage {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: string;
}

// §28: EmailProvider abstraction. The MVP must work end to end on
// MockEmailProvider alone — Gmail/Outlook only need to exist as stubs that
// never block the app when their OAuth credentials aren't configured yet.
export interface EmailProvider {
  readonly name: EmailProviderName;
  isConnected(organizationId: string): Promise<boolean>;
  connect(organizationId: string): Promise<void>;
  disconnect(organizationId: string): Promise<void>;
  listRecentMessages(organizationId: string, limit?: number): Promise<InboxMessage[]>;
}
