import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KpiCard } from '../shared/kpi-card';
import { RiskBadge } from '../shared/risk-badge';
import { DashboardService } from './dashboard.service';
import { ActionsService } from '../actions/actions.service';
import type { DashboardKpis } from './dashboard-kpis.model';
import type { OpportunityWithRisk } from './opportunity-with-risk.model';
import type { RecommendedAction } from '../actions/action.model';
import type { RiskLevel } from '../opportunities/risk-score.model';

export const RISK_LEVELS: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, KpiCard, RiskBadge],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  private readonly dashboard = inject(DashboardService);
  private readonly actions = inject(ActionsService);

  readonly loadingKpis = signal(true);
  readonly loadingAttention = signal(true);
  readonly error = signal('');
  readonly kpis = signal<DashboardKpis | null>(null);
  readonly needsAttention = signal<OpportunityWithRisk[]>([]);
  readonly actionsById = signal<Map<string, RecommendedAction>>(new Map());
  readonly breakdown = signal<Record<RiskLevel, number> | null>(null);

  readonly spectrum = computed(() => {
    const totals = this.breakdown();
    if (!totals) return [];
    const sum = RISK_LEVELS.reduce((acc, level) => acc + totals[level], 0);
    return RISK_LEVELS.map((level) => ({
      level,
      amount: totals[level],
      share: sum > 0 ? (totals[level] / sum) * 100 : 0,
    }));
  });

  constructor() {
    this.loadKpis();
    this.loadNeedsAttention();
    this.dashboard
      .getRiskBreakdown()
      .then((totals) => this.breakdown.set(totals))
      .catch(() => this.breakdown.set(null));
  }

  async loadKpis() {
    this.loadingKpis.set(true);
    try {
      this.kpis.set(await this.dashboard.getKpis());
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load dashboard KPIs.');
    } finally {
      this.loadingKpis.set(false);
    }
  }

  async loadNeedsAttention() {
    this.loadingAttention.set(true);
    try {
      const opportunities = await this.dashboard.getNeedsAttention();
      this.needsAttention.set(opportunities);
      this.actions
        .getForOpportunities(opportunities.map((o) => o.id))
        .then((map) => this.actionsById.set(map))
        .catch(() => this.actionsById.set(new Map()));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load priority opportunities.');
    } finally {
      this.loadingAttention.set(false);
    }
  }

  daysSince(iso: string | null): string {
    if (!iso) return 'No contact yet';
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    return days <= 0 ? 'Contacted today' : `${days}d since last contact`;
  }

  // ponytail: KPIs aggregate across an org's opportunities regardless of
  // per-opportunity currency; formatted as EUR assuming a single-currency org
  // (set at onboarding). Add real multi-currency conversion if that changes.
  formatCurrency(value: number, currency = 'EUR') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  }
}
