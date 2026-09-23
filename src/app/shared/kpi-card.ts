import { Component, input } from '@angular/core';

@Component({
  selector: 'app-kpi-card',
  template: `
    <div class="kpi-card" [class.emphasis]="emphasis()">
      <span class="kpi-label">{{ label() }}</span>
      <span class="kpi-value">{{ value() }}</span>
      <ng-content />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        animation: kpi-in 0.4s ease-out both;
        animation-delay: var(--kpi-delay, 0ms);
      }

      .kpi-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        height: 100%;
      }

      .kpi-label {
        font-size: 12px;
        font-weight: 500;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--text-secondary);
      }

      .kpi-value {
        font-size: 26px;
        font-weight: 600;
        letter-spacing: -0.02em;
      }

      .emphasis .kpi-value {
        font-size: 40px;
        color: var(--risk-critical);
      }

      @keyframes kpi-in {
        from {
          opacity: 0;
          transform: translateY(6px);
        }
      }
    `,
  ],
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly emphasis = input(false);
}
