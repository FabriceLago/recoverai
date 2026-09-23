import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';

// Fades an element up the first time it scrolls into view. Without
// IntersectionObserver the element is simply shown.
@Directive({ selector: '[appReveal]', host: { class: 'reveal' } })
export class Reveal implements OnInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private observer?: IntersectionObserver;

  ngOnInit() {
    // Never hide content that may not get an intersection callback: no
    // IntersectionObserver, a hidden tab, or reduced motion all show it at once.
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (typeof IntersectionObserver === 'undefined' || document.hidden || reduce) {
      this.el.classList.add('in');
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          this.el.classList.add('in');
          this.observer?.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    this.observer.observe(this.el);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }
}
