import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StatusBadge } from '../shared/status-badge';
import { RiskBadge } from '../shared/risk-badge';
import { PriorityBadge } from '../shared/priority-badge';
import { OpportunityForm } from './opportunity-form';
import { OpportunitiesService } from './opportunities.service';
import { RiskScoresService } from './risk-scores.service';
import { ActionsService } from '../actions/actions.service';
import { EmailComposerService } from './email-composer.service';
import { RevenueService } from './revenue.service';
import { TimelineService } from './timeline.service';
import { ToastService } from '../core/toast.service';
import type { Opportunity, OpportunityFormValue } from './opportunity.model';
import type { OpportunityRiskScore } from './risk-score.model';
import type { RecommendedAction } from '../actions/action.model';
import type { GeneratedEmail } from './email-composer.model';
import type { TimelineEntry } from './timeline.model';
import { TranslatePipe, TranslateDbPipe } from '../core/i18n/translate.pipe';
import { I18nService } from '../core/i18n/i18n.service';

@Component({
  selector: 'app-opportunity-detail-page',
  imports: [RouterLink, StatusBadge, RiskBadge, PriorityBadge, OpportunityForm, TranslatePipe, TranslateDbPipe],
  templateUrl: './opportunity-detail-page.html',
  styleUrl: './opportunity-detail-page.scss',
})
export class OpportunityDetailPage {
  private readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly opportunities = inject(OpportunitiesService);
  private readonly riskScores = inject(RiskScoresService);
  private readonly actions = inject(ActionsService);
  private readonly emailComposer = inject(EmailComposerService);
  private readonly revenue = inject(RevenueService);
  private readonly timelineService = inject(TimelineService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly opportunity = signal<Opportunity | null>(null);
  readonly riskScore = signal<OpportunityRiskScore | null>(null);
  readonly recommendedAction = signal<RecommendedAction | null>(null);
  readonly timeline = signal<TimelineEntry[]>([]);
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly recovering = signal(false);
  readonly error = signal('');

  readonly emailDraft = signal<GeneratedEmail | null>(null);
  readonly generatingEmail = signal(false);
  readonly sendingEmail = signal(false);
  readonly emailError = signal('');
  readonly emailSentAt = signal<string | null>(null);

  readonly formValue = computed<OpportunityFormValue | null>(() => {
    const opp = this.opportunity();
    if (!opp) return null;
    return {
      title: opp.title,
      company_name: opp.company_name,
      contact_name: opp.contact_name,
      contact_email: opp.contact_email,
      value: opp.value,
      currency: opp.currency,
      status: opp.status,
      expected_close_date: opp.expected_close_date,
      description: opp.description,
    };
  });

  constructor() {
    this.load();
  }

  async load() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    try {
      const opp = await this.opportunities.getById(id);
      if (!opp) {
        this.notFound.set(true);
      } else {
        this.opportunity.set(opp);
        this.loadDerived(opp);
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : this.i18n.t('Failed to load opportunity.'));
    } finally {
      this.loading.set(false);
    }
  }

  private loadDerived(opp: Opportunity) {
    this.riskScores
      .getForOpportunity(opp.id)
      .then((risk) => this.riskScore.set(risk))
      .catch(() => this.riskScore.set(null));
    this.actions
      .getForOpportunity(opp.id)
      .then((action) => this.recommendedAction.set(action))
      .catch(() => this.recommendedAction.set(null));
    this.timelineService
      .getForOpportunity(opp)
      .then((entries) => this.timeline.set(entries))
      .catch(() => this.timeline.set([]));
  }

  async onSave(value: OpportunityFormValue) {
    const opp = this.opportunity();
    if (!opp) return;
    this.saving.set(true);
    this.error.set('');
    try {
      const updated = await this.opportunities.update(opp.id, value);
      this.opportunity.set(updated);
      this.editing.set(false);
      this.loadDerived(updated);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : this.i18n.t('Failed to save changes.'));
    } finally {
      this.saving.set(false);
    }
  }

  async onDelete() {
    const opp = this.opportunity();
    if (!opp) return;
    if (!confirm(this.i18n.t('Delete "{title}"? This cannot be undone.', { title: opp.title }))) return;
    try {
      await this.opportunities.remove(opp.id);
      this.router.navigateByUrl('/opportunities');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : this.i18n.t('Failed to delete opportunity.'));
    }
  }

  async onMarkAsRecovered() {
    const opp = this.opportunity();
    if (!opp) return;
    const input = prompt(this.i18n.t('Recovered amount:'), opp.value.toString());
    if (input === null) return;
    const amount = Number(input);
    if (!Number.isFinite(amount) || amount < 0) {
      this.error.set(this.i18n.t('Enter a valid, non-negative amount.'));
      return;
    }
    this.recovering.set(true);
    this.error.set('');
    try {
      const updated = await this.revenue.markAsRecovered(opp.id, amount);
      this.opportunity.set(updated);
      this.loadDerived(updated);
      this.toast.show(this.i18n.t('Marked as recovered — revenue recorded.'));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : this.i18n.t('Failed to mark as recovered.'));
    } finally {
      this.recovering.set(false);
    }
  }

  async onCompleteAction() {
    const action = this.recommendedAction();
    if (!action) return;
    try {
      await this.actions.complete(action.id);
      this.recommendedAction.set({ ...action, status: 'COMPLETED' });
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : this.i18n.t('Failed to complete action.'));
    }
  }

  async onDismissAction() {
    const action = this.recommendedAction();
    if (!action) return;
    try {
      await this.actions.dismiss(action.id);
      this.recommendedAction.set({ ...action, status: 'DISMISSED' });
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : this.i18n.t('Failed to dismiss action.'));
    }
  }

  async onGenerateEmail() {
    const opp = this.opportunity();
    if (!opp) return;
    this.generatingEmail.set(true);
    this.emailError.set('');
    this.emailSentAt.set(null);
    try {
      const draft = await this.emailComposer.generate(opp, this.recommendedAction());
      this.emailDraft.set(draft);
    } catch (err) {
      this.emailError.set(err instanceof Error ? err.message : this.i18n.t('Failed to generate email.'));
    } finally {
      this.generatingEmail.set(false);
    }
  }

  onSubjectChange(event: Event) {
    const draft = this.emailDraft();
    if (!draft) return;
    this.emailDraft.set({ ...draft, subject: (event.target as HTMLInputElement).value });
  }

  onBodyChange(event: Event) {
    const draft = this.emailDraft();
    if (!draft) return;
    this.emailDraft.set({ ...draft, body: (event.target as HTMLTextAreaElement).value });
  }

  async onSendEmail() {
    const opp = this.opportunity();
    const draft = this.emailDraft();
    if (!opp || !draft) return;
    this.sendingEmail.set(true);
    this.emailError.set('');
    try {
      await this.emailComposer.simulateSend(opp, draft);
      this.emailSentAt.set(new Date().toISOString());
      this.toast.show(this.i18n.t('Simulation: email recorded as sent.'));
      this.emailDraft.set(null);
      const refreshed = await this.opportunities.getById(opp.id);
      if (refreshed) {
        this.opportunity.set(refreshed);
        this.loadDerived(refreshed);
      }
    } catch (err) {
      this.emailError.set(err instanceof Error ? err.message : this.i18n.t('Failed to send email.'));
    } finally {
      this.sendingEmail.set(false);
    }
  }

  formatCurrency(value: number, currency: string) {
    return new Intl.NumberFormat(this.i18n.locale(), { style: 'currency', currency }).format(value);
  }

  formatDate(value: string | null) {
    if (!value) return '—';
    return new Intl.DateTimeFormat(this.i18n.locale(), {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  }
}
