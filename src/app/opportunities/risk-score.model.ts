export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface OpportunityRiskScore {
  opportunity_id: string;
  organization_id: string;
  score: number;
  risk_level: RiskLevel;
  time_score: number;
  value_score: number;
  engagement_score: number;
  deadline_score: number;
  explanation: string[];
}
