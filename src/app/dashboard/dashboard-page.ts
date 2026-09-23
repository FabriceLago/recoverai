import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KpiCard } from '../shared/kpi-card';
import { RiskBadge } from '../shared/risk-badge';
import { DashboardService } from './dashboard.service';
import { ActionsService } from '../actions/actions.service';
import type { DashboardKpis } from './dashboard-kpis.model';
import type { OpportunityWithRisk } from './opportunity-with-risk.model';
import type { RecommendedAction } from '../actions/action.model';

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

  constructor() {
    this.loadKpis();
    this.loadNeedsAttention();
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

  // ponytail: KPIs aggregate across an org's opportunities regardless of
  // per-opportunity currency; formatted as EUR assuming a single-currency org
  // (set at onboarding). Add real multi-currency conversion if that changes.
  formatCurrency(value: number, currency = 'EUR') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  }
}
