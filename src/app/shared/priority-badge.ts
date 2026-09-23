import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '../core/i18n/translate.pipe';

const FILL: Record<string, string> = {
  LOW: 'var(--text-secondary)',
  MEDIUM: 'var(--accent)',
  HIGH: 'var(--risk-high)',
  URGENT: 'var(--risk-critical)',
};

const TEXT: Record<string, string> = {
  LOW: 'var(--text-secondary)',
  MEDIUM: 'var(--accent-text)',
  HIGH: 'var(--risk-high-text)',
  URGENT: 'var(--risk-critical-text)',
};

@Component({
  imports: [TranslatePipe],
  selector: 'app-priority-badge',
  template: `<span class="badge" [style.--badge-fill]="fill()" [style.--badge-text]="text()">{{ priority() | t }}</span>`,
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
export class PriorityBadge {
  readonly priority = input.required<string>();
  readonly fill = computed(() => FILL[this.priority()] ?? 'var(--text-secondary)');
  readonly text = computed(() => TEXT[this.priority()] ?? 'var(--text-secondary)');
}
