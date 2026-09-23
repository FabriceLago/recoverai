import type { Opportunity } from '../opportunities/opportunity.model';
import type { RiskLevel } from '../opportunities/risk-score.model';

export interface OpportunityWithRisk extends Opportunity {
  risk_score: number;
  risk_level: RiskLevel;
  risk_explanation: string[];
}
