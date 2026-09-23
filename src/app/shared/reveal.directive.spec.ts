import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { Reveal } from './reveal.directive';

@Component({ imports: [Reveal], template: `<div id="box" appReveal>content</div>` })
class Host {}

describe('Reveal', () => {
  afterEach(() => {
    delete (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;
  });

  it('shows the content immediately when IntersectionObserver is unavailable', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const box = (fixture.nativeElement as HTMLElement).querySelector('#box')!;
    expect(box.classList.contains('reveal')).toBe(true);
    expect(box.classList.contains('in')).toBe(true);
  });

  it('waits for the element to scroll into view when observation is possible', () => {
    let callback: (entries: { isIntersecting: boolean }[]) => void = () => undefined;
    (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = class {
      constructor(cb: typeof callback) {
        callback = cb;
      }
      observe() {}
      disconnect() {}
    };
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const box = (fixture.nativeElement as HTMLElement).querySelector('#box')!;
    expect(box.classList.contains('in')).toBe(false);
    callback([{ isIntersecting: true }]);
    expect(box.classList.contains('in')).toBe(true);
  });
});
