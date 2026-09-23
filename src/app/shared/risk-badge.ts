import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '../core/i18n/translate.pipe';

const FILL: Record<string, string> = {
  LOW: 'var(--risk-low)',
  MEDIUM: 'var(--risk-medium)',
  HIGH: 'var(--risk-high)',
  CRITICAL: 'var(--risk-critical)',
};

const TEXT: Record<string, string> = {
  LOW: 'var(--risk-low-text)',
  MEDIUM: 'var(--risk-medium-text)',
  HIGH: 'var(--risk-high-text)',
  CRITICAL: 'var(--risk-critical-text)',
};

@Component({
  imports: [TranslatePipe],
  selector: 'app-risk-badge',
  template: `<span class="badge" [style.--badge-fill]="fill()" [style.--badge-text]="text()">{{ level() | t }} · {{ score() }}/100</span>`,
  styles: [
    `
      .badge {
        display: inline-block;
        padding: 3px 9px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        font-family: var(--font-mono);
        color: var(--badge-text);
        background: color-mix(in srgb, var(--badge-fill) 16%, transparent);
      }
    `,
  ],
})
export class RiskBadge {
  readonly level = input.required<string>();
  readonly score = input.required<number>();
  readonly fill = computed(() => FILL[this.level()] ?? 'var(--text-secondary)');
  readonly text = computed(() => TEXT[this.level()] ?? 'var(--text-secondary)');
}
