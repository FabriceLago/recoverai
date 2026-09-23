export type TimelineEventType = 'CREATED' | 'EMAIL_OUTBOUND' | 'EMAIL_INBOUND' | 'RECOVERED' | 'WON' | 'LOST';

export interface TimelineEntry {
  type: TimelineEventType;
  label: string;
  at: string;
}
