import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';

// Impure on purpose: it must re-run when the language signal changes.
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: string | null | undefined, params?: Record<string, string | number>): string {
    return key ? this.i18n.t(key, params) : '';
  }
}

@Pipe({ name: 'tdb', pure: false })
export class TranslateDbPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(text: string | null | undefined): string {
    return this.i18n.translateDb(text);
  }
}
