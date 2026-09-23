import { Directive, ElementRef, effect, inject, input } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';

// Animates a number from its last shown value to the target, formatted for the
// active locale. Skips the tween when the user prefers reduced motion.
@Directive({ selector: '[appCountUp]' })
export class CountUp {
  readonly appCountUp = input.required<number>();
  readonly currency = input<string | null>(null);
  readonly duration = input(900);

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly i18n = inject(I18nService);
  private shown = 0;
  private frame = 0;

  constructor() {
    effect((onCleanup) => {
      const target = this.appCountUp();
      const currency = this.currency();
      const locale = this.i18n.locale();
      const duration = this.duration();

      const format = (n: number) =>
        currency
          ? new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
          : new Intl.NumberFormat(locale).format(Math.round(n));

      // Reduced motion, an unchanged value, or a hidden tab (frames are paused
      // there) all show the final number immediately instead of an empty cell.
      const reduce = (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
      if (reduce || document.hidden || this.shown === target) {
        this.shown = target;
        this.el.textContent = format(target);
        return;
      }

      const from = this.shown;
      this.el.textContent = format(from);
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        this.shown = from + (target - from) * eased;
        this.el.textContent = format(this.shown);
        if (t < 1) this.frame = requestAnimationFrame(tick);
      };
      this.frame = requestAnimationFrame(tick);
      onCleanup(() => cancelAnimationFrame(this.frame));
    });
  }
}
