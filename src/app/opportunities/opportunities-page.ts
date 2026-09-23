import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatusBadge } from '../shared/status-badge';
import { RiskBadge } from '../shared/risk-badge';
import { OpportunitiesService, type OpportunityListResult } from './opportunities.service';
import { RiskScoresService } from './risk-scores.service';
import { OPPORTUNITY_STATUSES, type Opportunity, type OpportunityStatus } from './opportunity.model';
import type { OpportunityRiskScore } from './risk-score.model';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-opportunities-page',
  imports: [RouterLink, StatusBadge, RiskBadge],
  templateUrl: './opportunities-page.html',
  styleUrl: './opportunities-page.scss',
})
export class OpportunitiesPage {
  private readonly opportunities = inject(OpportunitiesService);
  private readonly riskScores = inject(RiskScoresService);
  private searchDebounce?: ReturnType<typeof setTimeout>;

  readonly statuses = OPPORTUNITY_STATUSES;

  readonly search = signal('');
  readonly status = signal<OpportunityStatus | ''>('');
  readonly sortField = signal<keyof Opportunity>('created_at');
  readonly sortAscending = signal(false);
  readonly page = signal(0);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly result = signal<OpportunityListResult>({ data: [], count: 0 });
  readonly risksById = signal<Map<string, OpportunityRiskScore>>(new Map());

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.result().count / PAGE_SIZE)));

  constructor() {
    this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.opportunities.list({
        search: this.search(),
        status: this.status(),
        sortBy: this.sortField(),
        sortAscending: this.sortAscending(),
        page: this.page(),
        pageSize: PAGE_SIZE,
      });
      this.result.set(result);
      this.riskScores
        .getForOpportunities(result.data.map((o) => o.id))
        .then((map) => this.risksById.set(map))
        .catch(() => this.risksById.set(new Map()));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load opportunities.');
    } finally {
      this.loading.set(false);
    }
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.search.set(value);
    this.page.set(0);
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.load(), 300);
  }

  onStatusChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value as OpportunityStatus | '';
    this.status.set(value);
    this.page.set(0);
    this.load();
  }

  sortBy(field: keyof Opportunity) {
    if (this.sortField() === field) {
      this.sortAscending.set(!this.sortAscending());
    } else {
      this.sortField.set(field);
      this.sortAscending.set(true);
    }
    this.load();
  }

  prevPage() {
    if (this.page() === 0) return;
    this.page.set(this.page() - 1);
    this.load();
  }

  nextPage() {
    if (this.page() + 1 >= this.totalPages()) return;
    this.page.set(this.page() + 1);
    this.load();
  }

  formatCurrency(value: number, currency: string) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  }

  formatDate(value: string | null) {
    if (!value) return '—';
    return new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short' }).format(
      new Date(value),
    );
  }
}
