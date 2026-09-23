import type { Opportunity } from '../opportunities/opportunity.model';

export type ActionType = 'FOLLOW_UP_NOW' | 'FOLLOW_UP_TODAY' | 'FOLLOW_UP_SOON' | 'MONITOR';
export type ActionPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ActionStatus = 'PENDING' | 'COMPLETED' | 'DISMISSED';

export interface RecommendedAction {
  id: string;
  opportunity_id: string;
  action_type: ActionType;
  priority: ActionPriority;
  title: string;
  description: string | null;
  reason: string | null;
  generated_message: { subject: string; body: string } | null;
  status: ActionStatus;
  created_at: string;
  completed_at: string | null;
  opportunity: Opportunity;
}
