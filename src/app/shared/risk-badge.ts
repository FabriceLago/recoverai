import { Component, computed, input } from '@angular/core';

const RISK_COLORS: Record<string, string> = {
  LOW: 'var(--success)',
  MEDIUM: 'var(--warning)',
  HIGH: 'var(--warning)',
  CRITICAL: 'var(--danger)',
};

@Component({
  selector: 'app-risk-badge',
  template: `<span class="badge" [style.--badge-color]="color()">{{ level() }} · {{ score() }}/100</span>`,
  styles: [
    `
      .badge {
        display: inline-block;
        padding: 3px 9px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
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
