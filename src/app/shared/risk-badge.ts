import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '../core/i18n/translate.pipe';

const RISK_COLORS: Record<string, string> = {
  LOW: 'var(--risk-low)',
  MEDIUM: 'var(--risk-medium)',
  HIGH: 'var(--risk-high)',
  CRITICAL: 'var(--risk-critical)',
};

@Component({
  imports: [TranslatePipe],
  selector: 'app-risk-badge',
  template: `<span class="badge" [style.--badge-color]="color()">{{ level() | t }} · {{ score() }}/100</span>`,
  styles: [
    `
      .badge {
        display: inline-block;
        padding: 3px 9px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        font-family: var(--font-mono);
        color: var(--badge-color);
        background: color-mix(in srgb, var(--badge-color) 16%, transparent);
      }
    `,
  ],
})
export class RiskBadge {
  readonly level = input.required<string>();
  readonly score = input.required<number>();
  readonly color = computed(() => RISK_COLORS[this.level()] ?? 'var(--text-secondary)');
}
