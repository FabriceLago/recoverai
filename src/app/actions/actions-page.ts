import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PriorityBadge } from '../shared/priority-badge';
import { ActionsService } from './actions.service';
import type { RecommendedAction } from './action.model';
import { TranslatePipe, TranslateDbPipe } from '../core/i18n/translate.pipe';
import { I18nService } from '../core/i18n/i18n.service';

type Tab = 'today' | 'upcoming' | 'completed';

@Component({
  selector: 'app-actions-page',
  imports: [RouterLink, PriorityBadge, TranslatePipe, TranslateDbPipe],
  templateUrl: './actions-page.html',
  styleUrl: './actions-page.scss',
})
export class ActionsPage {
  private readonly i18n = inject(I18nService);
  private readonly actions = inject(ActionsService);

  readonly tab = signal<Tab>('today');
  readonly loading = signal(true);
  readonly error = signal('');

  readonly today = signal<RecommendedAction[]>([]);
  readonly upcoming = signal<RecommendedAction[]>([]);
  readonly completed = signal<RecommendedAction[]>([]);

  readonly visibleActions = computed(() => {
    switch (this.tab()) {
      case 'today':
        return this.today();
      case 'upcoming':
        return this.upcoming();
      case 'completed':
        return this.completed();
    }
  });

  constructor() {
    this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const [today, upcoming, completed] = await Promise.all([
        this.actions.list('PENDING', ['FOLLOW_UP_NOW', 'FOLLOW_UP_TODAY']),
        this.actions.list('PENDING', ['FOLLOW_UP_SOON', 'MONITOR']),
        this.actions.list('COMPLETED'),
      ]);
      this.today.set(today);
      this.upcoming.set(upcoming);
      this.completed.set(completed);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : this.i18n.t('Failed to load actions.'));
    } finally {
      this.loading.set(false);
    }
  }

  setTab(tab: Tab) {
    this.tab.set(tab);
  }

  async onComplete(id: string) {
    try {
      await this.actions.complete(id);
      await this.load();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : this.i18n.t('Failed to complete action.'));
    }
  }

  async onDismiss(id: string) {
    try {
      await this.actions.dismiss(id);
      await this.load();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : this.i18n.t('Failed to dismiss action.'));
    }
  }
}
