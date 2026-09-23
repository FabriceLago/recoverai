import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '../core/i18n/translate.pipe';

const FILL: Record<string, string> = {
  NEW: 'var(--accent)',
  QUALIFIED: 'var(--accent)',
  PROPOSAL_SENT: 'var(--risk-medium)',
  NEGOTIATION: 'var(--risk-medium)',
  WON: 'var(--risk-low)',
  LOST: 'var(--risk-critical)',
  DORMANT: 'var(--text-secondary)',
};

const TEXT: Record<string, string> = {
  NEW: 'var(--accent-text)',
  QUALIFIED: 'var(--accent-text)',
  PROPOSAL_SENT: 'var(--risk-medium-text)',
  NEGOTIATION: 'var(--risk-medium-text)',
  WON: 'var(--risk-low-text)',
  LOST: 'var(--risk-critical-text)',
  DORMANT: 'var(--text-secondary)',
};

@Component({
  imports: [TranslatePipe],
  selector: 'app-status-badge',
  template: `<span class="badge" [style.--badge-fill]="fill()" [style.--badge-text]="text()">{{ status() | t }}</span>`,
  styles: [
    `
      .badge {
        display: inline-block;
        padding: 3px 9px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        color: var(--badge-text);
        background: color-mix(in srgb, var(--badge-fill) 16%, transparent);
      }
    `,
  ],
})
export class StatusBadge {
  readonly status = input.required<string>();
  readonly fill = computed(() => FILL[this.status()] ?? 'var(--text-secondary)');
  readonly text = computed(() => TEXT[this.status()] ?? 'var(--text-secondary)');
}
