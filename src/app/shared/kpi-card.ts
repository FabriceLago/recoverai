import { Component, input } from '@angular/core';

@Component({
  selector: 'app-kpi-card',
  template: `
    <div class="kpi-card">
      <span class="kpi-label">{{ label() }}</span>
      <span class="kpi-value">{{ value() }}</span>
    </div>
  `,
  styles: [
    `
      .kpi-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .kpi-label {
        font-size: 13px;
        color: var(--text-secondary);
      }

      .kpi-value {
        font-size: 26px;
        font-weight: 700;
      }
    `,
  ],
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
}
