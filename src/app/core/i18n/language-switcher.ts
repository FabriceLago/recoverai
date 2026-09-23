import { Component, inject } from '@angular/core';
import { I18nService, type Lang } from './i18n.service';

@Component({
  selector: 'app-language-switcher',
  template: `
    <div class="switcher" role="group" aria-label="Language / Langue">
      @for (option of options; track option) {
        <button
          type="button"
          [class.active]="i18n.lang() === option"
          [attr.aria-pressed]="i18n.lang() === option"
          (click)="i18n.setLang(option)"
        >
          {{ option.toUpperCase() }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      .switcher {
        display: inline-flex;
        border: 1px solid var(--border);
        border-radius: 8px;
        overflow: hidden;
      }

      button {
        background: transparent;
        border: none;
        color: var(--text-secondary);
        font-size: 12px;
        font-weight: 600;
        padding: 5px 9px;
        cursor: pointer;
      }

      button.active {
        background: var(--accent);
        color: var(--accent-contrast);
      }
    `,
  ],
})
export class LanguageSwitcher {
  protected readonly i18n = inject(I18nService);
  protected readonly options: Lang[] = ['en', 'fr'];
}
