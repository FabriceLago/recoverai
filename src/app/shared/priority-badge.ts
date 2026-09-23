import { Component, computed, input } from '@angular/core';

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'var(--text-secondary)',
  MEDIUM: 'var(--accent)',
  HIGH: 'var(--warning)',
  URGENT: 'var(--danger)',
};

@Component({
  selector: 'app-priority-badge',
  template: `<span class="badge" [style.--badge-color]="color()">{{ priority() }}</span>`,
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
export class PriorityBadge {
  readonly priority = input.required<string>();
  readonly color = computed(() => PRIORITY_COLORS[this.priority()] ?? 'var(--text-secondary)');
}
