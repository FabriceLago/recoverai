import { Component, computed, input } from '@angular/core';

const STATUS_COLORS: Record<string, string> = {
  NEW: 'var(--accent)',
  QUALIFIED: 'var(--accent)',
  PROPOSAL_SENT: 'var(--warning)',
  NEGOTIATION: 'var(--warning)',
  WON: 'var(--success)',
  LOST: 'var(--danger)',
  DORMANT: 'var(--text-secondary)',
};

@Component({
  selector: 'app-status-badge',
  template: `<span class="badge" [style.--badge-color]="color()">{{ status() }}</span>`,
  styles: [
    `
      .badge {
        display: inline-block;
        padding: 3px 9px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        color: var(--badge-color);
        background: color-mix(in srgb, var(--badge-color) 16%, transparent);
      }
    `,
  ],
})
export class StatusBadge {
  readonly status = input.required<string>();
  readonly color = computed(() => STATUS_COLORS[this.status()] ?? 'var(--text-secondary)');
}
